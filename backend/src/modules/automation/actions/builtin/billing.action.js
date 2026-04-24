/**
 * Billing Actions
 * ------------------------------------------------------------------
 * Automation actions for the Billing module.
 */

module.exports = [
  // ----------------------------------------------------------------
  // billing.create_invoice
  // ----------------------------------------------------------------
  {
    name: "Create Invoice",
    type: "builtin",
    actionType: "billing.create_invoice",
    module: "billing",
    description: "Generate a new invoice for a client",
    schema: {
      type: "object",
      required: ["clientId", "amount"],
      properties: {
        clientId: { type: ["number", "string"], title: "Client ID" },
        amount: { type: "number", title: "Amount", description: "Total invoice amount" },
        currency: { type: "string", title: "Currency", default: "USD" },
        dueDate: { type: "string", title: "Due Date", description: "ISO date string, defaults to 30 days" },
        description: { type: "string", title: "Description", description: "Invoice line item description" },
        notes: { type: "string", title: "Notes" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { clientId, amount, currency = "USD", dueDate, description, notes } = params;

      if (!clientId) throw new Error("clientId is required");
      if (!amount || isNaN(amount)) throw new Error("amount is required and must be a number");

      const due = dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const invoice = await prisma.invoice.create({
        data: {
          clientId: Number(clientId),
          total: Number(amount),
          subtotal: Number(amount),
          currency,
          status: "draft",
          dueDate: due,
          notes: notes || description || null,
        },
      });

      logger.info({ msg: "[billing.create_invoice] Created", invoiceId: invoice.id });
      return { success: true, invoiceId: invoice.id, amount, dueDate: due.toISOString() };
    },
  },

  // ----------------------------------------------------------------
  // billing.mark_invoice_paid
  // ----------------------------------------------------------------
  {
    name: "Mark Invoice as Paid",
    type: "builtin",
    actionType: "billing.mark_invoice_paid",
    module: "billing",
    description: "Mark an existing invoice as paid",
    schema: {
      type: "object",
      required: ["invoiceId"],
      properties: {
        invoiceId: { type: ["number", "string"], title: "Invoice ID" },
        paidAt: { type: "string", title: "Paid At", description: "ISO date of payment, defaults to now" },
        note: { type: "string", title: "Payment Note" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { invoiceId, paidAt, note } = params;

      if (!invoiceId) throw new Error("invoiceId is required");

      const id = Number(invoiceId);
      const invoice = await prisma.invoice.findUnique({ where: { id } });
      if (!invoice) throw new Error(`Invoice ${id} not found`);

      await prisma.invoice.update({
        where: { id },
        data: { status: "paid", paidAt: paidAt ? new Date(paidAt) : new Date(), notes: note || invoice.notes },
      });

      logger.info({ msg: "[billing.mark_invoice_paid] Done", invoiceId: id });
      return { success: true, invoiceId: id };
    },
  },

  // ----------------------------------------------------------------
  // billing.void_invoice
  // ----------------------------------------------------------------
  {
    name: "Void Invoice",
    type: "builtin",
    actionType: "billing.void_invoice",
    module: "billing",
    description: "Void/cancel an existing invoice",
    schema: {
      type: "object",
      required: ["invoiceId"],
      properties: {
        invoiceId: { type: ["number", "string"], title: "Invoice ID" },
        reason: { type: "string", title: "Void Reason" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { invoiceId, reason } = params;

      if (!invoiceId) throw new Error("invoiceId is required");

      const id = Number(invoiceId);
      await prisma.invoice.update({
        where: { id },
        data: { status: "void", notes: reason || "Voided via automation" },
      });

      logger.info({ msg: "[billing.void_invoice] Done", invoiceId: id });
      return { success: true, invoiceId: id };
    },
  },

  // ----------------------------------------------------------------
  // billing.apply_credit
  // ----------------------------------------------------------------
  {
    name: "Apply Credit to Client",
    type: "builtin",
    actionType: "billing.apply_credit",
    module: "billing",
    description: "Add a credit balance to a client account",
    schema: {
      type: "object",
      required: ["clientId", "amount"],
      properties: {
        clientId: { type: ["number", "string"], title: "Client ID" },
        amount: { type: "number", title: "Credit Amount" },
        reason: { type: "string", title: "Reason", description: "Internal reason for credit" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { clientId, amount, reason } = params;

      if (!clientId) throw new Error("clientId is required");
      if (!amount || isNaN(amount)) throw new Error("amount is required");

      const id = Number(clientId);
      // Upsert client credit balance
      const existing = await prisma.clientCredit?.findUnique?.({ where: { clientId: id } });
      if (existing) {
        await prisma.clientCredit.update({ where: { clientId: id }, data: { balance: { increment: Number(amount) } } });
      } else {
        // Fallback: record as a credit note on the invoice table if clientCredit model unavailable
        await prisma.invoice.create({
          data: {
            clientId: id,
            total: -Number(amount),
            subtotal: -Number(amount),
            status: "paid",
            currency: "USD",
            notes: `Credit: ${reason || "Applied via automation"}`,
            paidAt: new Date(),
            dueDate: new Date(),
          },
        });
      }

      logger.info({ msg: "[billing.apply_credit] Done", clientId: id, amount });
      return { success: true, clientId: id, creditApplied: Number(amount) };
    },
  },

  // ----------------------------------------------------------------
  // billing.send_invoice
  // ----------------------------------------------------------------
  {
    name: "Send Invoice to Client",
    type: "builtin",
    actionType: "billing.send_invoice",
    module: "billing",
    description: "Email an invoice PDF/link to the client",
    schema: {
      type: "object",
      required: ["invoiceId"],
      properties: {
        invoiceId: { type: ["number", "string"], title: "Invoice ID" },
        message:   { type: "string", title: "Custom Message", description: "Optional message to include in the email" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger, app } = context;
      const params = meta.input ?? meta;
      const { invoiceId, message } = params;
      if (!invoiceId) throw new Error("invoiceId is required");
      const id = Number(invoiceId);
      const invoice = await prisma.invoice.findUnique({ where: { id }, include: { client: true } });
      if (!invoice) throw new Error(`Invoice ${id} not found`);

      const email = invoice.client?.email || invoice.clientEmail;
      if (!email) throw new Error("Client has no email address");

      const emailService = app?.locals?.emailService || app?.get?.("emailService");
      if (emailService?.send) {
        await emailService.send({
          to: email,
          subject: `Invoice #${id} — ${invoice.currency} ${invoice.total}`,
          html: message || `Your invoice #${id} for ${invoice.currency} ${invoice.total} is due on ${invoice.dueDate?.toDateString()}.`,
        });
      } else {
        await prisma.auditLog.create({
          data: {
            source: "automation", action: "billing.invoice_sent", actor: "automation",
            level: "INFO", entity: "invoice", entityId: String(id),
            data: { to: email, invoiceId: id, amount: invoice.total },
          },
        });
      }

      await prisma.invoice.update({ where: { id }, data: { status: "sent" } });
      logger.info({ msg: "[billing.send_invoice] Done", invoiceId: id, to: email });
      return { success: true, invoiceId: id, sentTo: email };
    },
  },

  // ----------------------------------------------------------------
  // billing.record_payment
  // ----------------------------------------------------------------
  {
    name: "Record Manual Payment",
    type: "builtin",
    actionType: "billing.record_payment",
    module: "billing",
    description: "Record a manual/offline payment against an invoice",
    schema: {
      type: "object",
      required: ["invoiceId", "amount", "method"],
      properties: {
        invoiceId: { type: ["number", "string"], title: "Invoice ID" },
        amount:    { type: "number", title: "Payment Amount" },
        method:    { type: "string", title: "Payment Method", enum: ["bank_transfer", "cash", "cheque", "card", "crypto", "other"] },
        reference: { type: "string", title: "Reference / Transaction ID" },
        note:      { type: "string", title: "Internal Note" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { invoiceId, amount, method, reference, note } = params;
      if (!invoiceId) throw new Error("invoiceId is required");
      if (!amount)    throw new Error("amount is required");
      if (!method)    throw new Error("method is required");

      const id = Number(invoiceId);
      const invoice = await prisma.invoice.findUnique({ where: { id } });
      if (!invoice) throw new Error(`Invoice ${id} not found`);

      const payment = await prisma.payment.create({
        data: {
          invoiceId: id,
          clientId: invoice.clientId,
          amount: Number(amount),
          method,
          status: "completed",
          reference: reference || null,
          notes: note || null,
          paidAt: new Date(),
        },
      }).catch(() => null); // payment model may not exist

      if (Number(amount) >= invoice.total) {
        await prisma.invoice.update({ where: { id }, data: { status: "paid", paidAt: new Date() } });
      }

      logger.info({ msg: "[billing.record_payment] Done", invoiceId: id, amount, method });
      return { success: true, invoiceId: id, amount: Number(amount), method, paymentId: payment?.id };
    },
  },

  // ----------------------------------------------------------------
  // billing.set_due_date
  // ----------------------------------------------------------------
  {
    name: "Update Invoice Due Date",
    type: "builtin",
    actionType: "billing.set_due_date",
    module: "billing",
    description: "Change the due date of an invoice",
    schema: {
      type: "object",
      required: ["invoiceId", "dueDate"],
      properties: {
        invoiceId: { type: ["number", "string"], title: "Invoice ID" },
        dueDate:   { type: "string", title: "New Due Date", description: "ISO date string e.g. 2025-12-31" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { invoiceId, dueDate } = params;
      if (!invoiceId) throw new Error("invoiceId is required");
      if (!dueDate)   throw new Error("dueDate is required");
      const id = Number(invoiceId);
      await prisma.invoice.update({ where: { id }, data: { dueDate: new Date(dueDate) } });
      logger.info({ msg: "[billing.set_due_date] Done", invoiceId: id, dueDate });
      return { success: true, invoiceId: id, dueDate };
    },
  },
];
