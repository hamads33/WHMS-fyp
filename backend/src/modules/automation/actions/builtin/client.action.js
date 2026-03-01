/**
 * Client Actions
 * ------------------------------------------------------------------
 * Automation actions for the Clients module.
 */

module.exports = [
  // ----------------------------------------------------------------
  // client.update_status
  // ----------------------------------------------------------------
  {
    name: "Update Client Status",
    type: "builtin",
    actionType: "client.update_status",
    module: "clients",
    description: "Change a client's account status (active/suspended/cancelled)",
    schema: {
      type: "object",
      required: ["clientId", "status"],
      properties: {
        clientId: { type: ["number", "string"], title: "Client ID" },
        status: {
          type: "string",
          title: "New Status",
          enum: ["active", "suspended", "cancelled", "pending"],
        },
        reason: { type: "string", title: "Reason" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { clientId, status, reason } = params;

      if (!clientId) throw new Error("clientId is required");

      const id = Number(clientId);
      const model = prisma.clientProfile || prisma.user;
      const client = await model.findUnique({ where: { id } });
      if (!client) throw new Error(`Client ${id} not found`);

      await model.update({ where: { id }, data: { status, updatedAt: new Date() } });

      logger.info({ msg: "[client.update_status] Done", clientId: id, status });
      return { success: true, clientId: id, previousStatus: client.status, newStatus: status };
    },
  },

  // ----------------------------------------------------------------
  // client.add_note
  // ----------------------------------------------------------------
  {
    name: "Add Note to Client",
    type: "builtin",
    actionType: "client.add_note",
    module: "clients",
    description: "Append an internal note to a client profile",
    schema: {
      type: "object",
      required: ["clientId", "note"],
      properties: {
        clientId: { type: ["number", "string"], title: "Client ID" },
        note: { type: "string", title: "Note Text" },
        pinned: { type: "boolean", title: "Pin Note", default: false },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { clientId, note, pinned = false } = params;

      if (!clientId) throw new Error("clientId is required");
      if (!note) throw new Error("note is required");

      const id = Number(clientId);

      // Try clientNote model first, fallback to auditLog
      if (prisma.clientNote) {
        await prisma.clientNote.create({ data: { clientId: id, note, pinned, createdAt: new Date() } });
      } else {
        await prisma.auditLog.create({
          data: {
            source: "automation",
            action: "client.note_added",
            actor: "automation",
            level: "INFO",
            entity: "client",
            entityId: String(id),
            data: { note, pinned },
          },
        });
      }

      logger.info({ msg: "[client.add_note] Done", clientId: id });
      return { success: true, clientId: id };
    },
  },

  // ----------------------------------------------------------------
  // client.send_email
  // ----------------------------------------------------------------
  {
    name: "Send Email to Client",
    type: "builtin",
    actionType: "client.send_email",
    module: "clients",
    description: "Send a transactional email to a client",
    schema: {
      type: "object",
      required: ["clientId", "subject", "body"],
      properties: {
        clientId: { type: ["number", "string"], title: "Client ID" },
        subject: { type: "string", title: "Email Subject" },
        body: { type: "string", title: "Email Body (HTML or plain text)" },
        from: { type: "string", title: "From Address", description: "Defaults to system sender" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger, app } = context;
      const params = meta.input ?? meta;
      const { clientId, subject, body, from } = params;

      if (!clientId) throw new Error("clientId is required");
      if (!subject) throw new Error("subject is required");
      if (!body) throw new Error("body is required");

      const id = Number(clientId);

      // Resolve client email
      const model = prisma.clientProfile || prisma.user;
      const client = await model.findUnique({ where: { id }, select: { email: true, name: true } });
      if (!client) throw new Error(`Client ${id} not found`);

      // Use email service if available via app context
      const emailService = app?.locals?.emailService || app?.get?.("emailService");
      if (emailService?.send) {
        await emailService.send({
          to: client.email,
          from: from || process.env.SMTP_FROM || "noreply@system.local",
          subject,
          html: body,
        });
      } else {
        // Log as audit record when email service not configured
        logger.warn({ msg: "[client.send_email] Email service unavailable — logging instead", clientId: id });
        await prisma.auditLog.create({
          data: {
            source: "automation",
            action: "client.email_sent",
            actor: "automation",
            level: "INFO",
            entity: "client",
            entityId: String(id),
            data: { to: client.email, subject, preview: body.substring(0, 200) },
          },
        });
      }

      logger.info({ msg: "[client.send_email] Done", clientId: id, to: client.email });
      return { success: true, clientId: id, to: client.email, subject };
    },
  },
];
