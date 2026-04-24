/**
 * Order Actions
 * ------------------------------------------------------------------
 * Automation actions for the Orders module.
 * Uses Prisma directly — no HTTP round-trip required.
 */

const VALID_STATUSES = ["pending", "active", "suspended", "cancelled", "completed", "refunded"];

module.exports = [
  // ----------------------------------------------------------------
  // order.update_status
  // ----------------------------------------------------------------
  {
    name: "Update Order Status",
    type: "builtin",
    actionType: "order.update_status",
    module: "orders",
    description: "Change the status of an existing order",
    schema: {
      type: "object",
      required: ["orderId", "status"],
      properties: {
        orderId: { type: ["number", "string"], title: "Order ID", description: "ID of the order to update" },
        status: {
          type: "string",
          title: "New Status",
          enum: VALID_STATUSES,
          description: "The target status",
        },
        note: { type: "string", title: "Internal Note", description: "Optional note recorded on the order" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { orderId, status, note } = params;

      if (!orderId) throw new Error("orderId is required");
      if (!VALID_STATUSES.includes(status)) throw new Error(`Invalid status: ${status}`);

      const id = Number(orderId);
      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) throw new Error(`Order ${id} not found`);

      const updated = await prisma.order.update({
        where: { id },
        data: { status, ...(note && { internalNote: note }), updatedAt: new Date() },
      });

      logger.info({ msg: "[order.update_status] Done", orderId: id, status });
      return { success: true, orderId: id, previousStatus: order.status, newStatus: status };
    },
  },

  // ----------------------------------------------------------------
  // order.add_note
  // ----------------------------------------------------------------
  {
    name: "Add Note to Order",
    type: "builtin",
    actionType: "order.add_note",
    module: "orders",
    description: "Append an internal note to an order",
    schema: {
      type: "object",
      required: ["orderId", "note"],
      properties: {
        orderId: { type: ["number", "string"], title: "Order ID" },
        note: { type: "string", title: "Note", description: "Text of the note to add" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { orderId, note } = params;

      if (!orderId) throw new Error("orderId is required");
      if (!note) throw new Error("note is required");

      const id = Number(orderId);
      await prisma.order.update({ where: { id }, data: { internalNote: note, updatedAt: new Date() } });

      logger.info({ msg: "[order.add_note] Done", orderId: id });
      return { success: true, orderId: id };
    },
  },

  // ----------------------------------------------------------------
  // order.complete
  // ----------------------------------------------------------------
  {
    name: "Complete Order",
    type: "builtin",
    actionType: "order.complete",
    module: "orders",
    description: "Mark an order as completed/fulfilled",
    schema: {
      type: "object",
      required: ["orderId"],
      properties: {
        orderId: { type: ["number", "string"], title: "Order ID" },
        note:    { type: "string", title: "Completion Note" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { orderId, note } = params;
      if (!orderId) throw new Error("orderId is required");
      const id = Number(orderId);
      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) throw new Error(`Order ${id} not found`);
      if (order.status === "completed") return { success: true, orderId: id, message: "Already completed" };
      await prisma.order.update({
        where: { id },
        data: { status: "completed", ...(note && { internalNote: note }), updatedAt: new Date() },
      });
      logger.info({ msg: "[order.complete] Done", orderId: id });
      return { success: true, orderId: id, previousStatus: order.status };
    },
  },

  // ----------------------------------------------------------------
  // order.refund
  // ----------------------------------------------------------------
  {
    name: "Refund Order",
    type: "builtin",
    actionType: "order.refund",
    module: "orders",
    description: "Mark an order as refunded and record the reason",
    schema: {
      type: "object",
      required: ["orderId"],
      properties: {
        orderId: { type: ["number", "string"], title: "Order ID" },
        reason:  { type: "string", title: "Refund Reason" },
        amount:  { type: "number", title: "Refund Amount", description: "Partial amount — omit for full refund" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { orderId, reason, amount } = params;
      if (!orderId) throw new Error("orderId is required");
      const id = Number(orderId);
      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) throw new Error(`Order ${id} not found`);
      await prisma.order.update({
        where: { id },
        data: { status: "refunded", internalNote: reason ? `Refund: ${reason}` : "Refunded via automation", updatedAt: new Date() },
      });
      logger.info({ msg: "[order.refund] Done", orderId: id });
      return { success: true, orderId: id, refundAmount: amount || order.total };
    },
  },

  // ----------------------------------------------------------------
  // order.cancel
  // ----------------------------------------------------------------
  {
    name: "Cancel Order",
    type: "builtin",
    actionType: "order.cancel",
    module: "orders",
    description: "Cancel an order with an optional reason",
    schema: {
      type: "object",
      required: ["orderId"],
      properties: {
        orderId: { type: ["number", "string"], title: "Order ID" },
        reason: { type: "string", title: "Cancellation Reason" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { orderId, reason } = params;

      if (!orderId) throw new Error("orderId is required");

      const id = Number(orderId);
      const order = await prisma.order.findUnique({ where: { id } });
      if (!order) throw new Error(`Order ${id} not found`);
      if (order.status === "cancelled") return { success: true, orderId: id, message: "Already cancelled" };

      await prisma.order.update({
        where: { id },
        data: { status: "cancelled", internalNote: reason || "Cancelled via automation", updatedAt: new Date() },
      });

      logger.info({ msg: "[order.cancel] Done", orderId: id });
      return { success: true, orderId: id, previousStatus: order.status };
    },
  },
];
