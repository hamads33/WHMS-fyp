/**
 * Support Actions
 * ------------------------------------------------------------------
 * Automation actions for the Support module.
 */

module.exports = [
  // ----------------------------------------------------------------
  // support.create_ticket
  // ----------------------------------------------------------------
  {
    name: "Create Support Ticket",
    type: "builtin",
    actionType: "support.create_ticket",
    module: "support",
    description: "Open a new support ticket on behalf of a client",
    schema: {
      type: "object",
      required: ["clientId", "subject"],
      properties: {
        clientId: { type: ["number", "string"], title: "Client ID" },
        subject: { type: "string", title: "Subject" },
        message: { type: "string", title: "Initial Message", description: "Body of the first reply" },
        priority: {
          type: "string",
          title: "Priority",
          enum: ["low", "medium", "high", "critical"],
          default: "medium",
        },
        department: { type: "string", title: "Department", description: "Department name or ID" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { clientId, subject, message, priority = "medium", department } = params;

      if (!clientId) throw new Error("clientId is required");
      if (!subject) throw new Error("subject is required");

      const id = Number(clientId);

      const ticket = await prisma.supportTicket.create({
        data: {
          clientId: id,
          subject,
          status: "open",
          priority,
          department: department || "General",
          createdAt: new Date(),
          ...(message && {
            replies: {
              create: {
                authorId: id,
                authorRole: "client",
                content: message,
                createdAt: new Date(),
              },
            },
          }),
        },
      });

      logger.info({ msg: "[support.create_ticket] Done", ticketId: ticket.id });
      return { success: true, ticketId: ticket.id, subject };
    },
  },

  // ----------------------------------------------------------------
  // support.update_ticket_status
  // ----------------------------------------------------------------
  {
    name: "Update Ticket Status",
    type: "builtin",
    actionType: "support.update_ticket_status",
    module: "support",
    description: "Change the status or priority of a support ticket",
    schema: {
      type: "object",
      required: ["ticketId"],
      properties: {
        ticketId: { type: ["number", "string"], title: "Ticket ID" },
        status: {
          type: "string",
          title: "Status",
          enum: ["open", "in_progress", "waiting_client", "resolved", "closed"],
        },
        priority: {
          type: "string",
          title: "Priority",
          enum: ["low", "medium", "high", "critical"],
        },
        note: { type: "string", title: "Internal Note" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { ticketId, status, priority, note } = params;

      if (!ticketId) throw new Error("ticketId is required");
      if (!status && !priority) throw new Error("At least one of status or priority must be provided");

      const id = Number(ticketId);
      const ticket = await prisma.supportTicket.findUnique({ where: { id } });
      if (!ticket) throw new Error(`Ticket ${id} not found`);

      const data = {};
      if (status) data.status = status;
      if (priority) data.priority = priority;
      if (status === "closed" || status === "resolved") data.closedAt = new Date();

      await prisma.supportTicket.update({ where: { id }, data });

      if (note) {
        await prisma.ticketReply?.create?.({
          data: { ticketId: id, authorRole: "system", content: note, isInternal: true, createdAt: new Date() },
        });
      }

      logger.info({ msg: "[support.update_ticket_status] Done", ticketId: id });
      return { success: true, ticketId: id, previousStatus: ticket.status, newStatus: status || ticket.status };
    },
  },

  // ----------------------------------------------------------------
  // support.add_ticket_reply
  // ----------------------------------------------------------------
  {
    name: "Add Reply to Ticket",
    type: "builtin",
    actionType: "support.add_reply",
    module: "support",
    description: "Post a reply or internal note to an existing ticket",
    schema: {
      type: "object",
      required: ["ticketId", "message"],
      properties: {
        ticketId: { type: ["number", "string"], title: "Ticket ID" },
        message: { type: "string", title: "Message Content" },
        isInternal: { type: "boolean", title: "Internal Note", default: false },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { ticketId, message, isInternal = false } = params;

      if (!ticketId) throw new Error("ticketId is required");
      if (!message) throw new Error("message is required");

      const id = Number(ticketId);
      const ticket = await prisma.supportTicket.findUnique({ where: { id } });
      if (!ticket) throw new Error(`Ticket ${id} not found`);

      await prisma.ticketReply?.create?.({
        data: { ticketId: id, authorRole: "system", content: message, isInternal, createdAt: new Date() },
      });

      logger.info({ msg: "[support.add_reply] Done", ticketId: id });
      return { success: true, ticketId: id };
    },
  },
];
