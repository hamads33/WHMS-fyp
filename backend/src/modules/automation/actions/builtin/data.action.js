/**
 * Data Lookup Actions
 * ------------------------------------------------------------------
 * Query the database and pass structured data to the next step
 * via the workflow context (results.stepN.output).
 */

module.exports = [
  // ----------------------------------------------------------------
  // data.lookup_user
  // ----------------------------------------------------------------
  {
    name: "Look Up User",
    type: "builtin",
    actionType: "data.lookup_user",
    module: "data",
    description: "Fetch user details by ID or email and pass them to subsequent steps",
    schema: {
      type: "object",
      properties: {
        userId: { type: ["number", "string"], title: "User ID", description: "Either userId or email is required" },
        email:  { type: "string", title: "Email Address" },
        fields: { type: "string", title: "Fields to return", description: "Comma-separated: id,name,email,role,status", default: "id,name,email,role" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { userId, email, fields = "id,name,email,role" } = params;

      if (!userId && !email) throw new Error("userId or email is required");

      const where = userId ? { id: Number(userId) } : { email };
      const select = fields.split(",").reduce((acc, f) => { acc[f.trim()] = true; return acc; }, {});

      const user = await prisma.user.findUnique({ where, select });
      if (!user) throw new Error(`User not found`);

      logger.info({ msg: "[data.lookup_user] Found", userId: user.id });
      return { success: true, found: true, user };
    },
  },

  // ----------------------------------------------------------------
  // data.lookup_order
  // ----------------------------------------------------------------
  {
    name: "Look Up Order",
    type: "builtin",
    actionType: "data.lookup_order",
    module: "data",
    description: "Fetch order details by ID and pass them to subsequent steps",
    schema: {
      type: "object",
      required: ["orderId"],
      properties: {
        orderId: { type: ["number", "string"], title: "Order ID" },
        includeItems: { type: "boolean", title: "Include Line Items", default: false },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { orderId, includeItems = false } = params;

      if (!orderId) throw new Error("orderId is required");

      const id = Number(orderId);
      const order = await prisma.order.findUnique({
        where: { id },
        include: includeItems ? { orderItems: true } : undefined,
      });
      if (!order) throw new Error(`Order ${id} not found`);

      logger.info({ msg: "[data.lookup_order] Found", orderId: id });
      return { success: true, found: true, order };
    },
  },

  // ----------------------------------------------------------------
  // data.lookup_client
  // ----------------------------------------------------------------
  {
    name: "Look Up Client",
    type: "builtin",
    actionType: "data.lookup_client",
    module: "data",
    description: "Fetch client profile details and pass them to subsequent steps",
    schema: {
      type: "object",
      properties: {
        clientId: { type: ["number", "string"], title: "Client ID" },
        email:    { type: "string", title: "Email Address" },
        includeServices: { type: "boolean", title: "Include Services", default: false },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { clientId, email, includeServices = false } = params;

      if (!clientId && !email) throw new Error("clientId or email is required");

      const where = clientId ? { id: Number(clientId) } : { email };
      const model = prisma.clientProfile || prisma.user;

      const client = await model.findUnique({
        where,
        include: includeServices ? { services: true } : undefined,
      });
      if (!client) throw new Error("Client not found");

      logger.info({ msg: "[data.lookup_client] Found", clientId: client.id });
      return { success: true, found: true, client };
    },
  },

  // ----------------------------------------------------------------
  // data.lookup_invoice
  // ----------------------------------------------------------------
  {
    name: "Look Up Invoice",
    type: "builtin",
    actionType: "data.lookup_invoice",
    module: "data",
    description: "Fetch invoice details by ID",
    schema: {
      type: "object",
      required: ["invoiceId"],
      properties: {
        invoiceId: { type: ["number", "string"], title: "Invoice ID" },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { invoiceId } = params;

      if (!invoiceId) throw new Error("invoiceId is required");

      const id = Number(invoiceId);
      const invoice = await prisma.invoice.findUnique({ where: { id } });
      if (!invoice) throw new Error(`Invoice ${id} not found`);

      logger.info({ msg: "[data.lookup_invoice] Found", invoiceId: id });
      return { success: true, found: true, invoice };
    },
  },

  // ----------------------------------------------------------------
  // data.count_records
  // ----------------------------------------------------------------
  {
    name: "Count Records",
    type: "builtin",
    actionType: "data.count_records",
    module: "data",
    description: "Count rows in a table matching a condition — useful for threshold checks",
    schema: {
      type: "object",
      required: ["model"],
      properties: {
        model:  { type: "string", title: "Model / Table", enum: ["order", "invoice", "user", "supportTicket"], description: "Which table to count" },
        where:  { type: "string", title: "Filter (JSON)", description: 'JSON string of Prisma where clause, e.g. {"status":"pending"}' },
      },
    },
    async execute(meta, context) {
      const { prisma, logger } = context;
      const params = meta.input ?? meta;
      const { model, where: whereStr } = params;

      if (!model) throw new Error("model is required");

      const where = whereStr ? JSON.parse(whereStr) : {};
      const dao = prisma[model];
      if (!dao) throw new Error(`Model "${model}" not found`);

      const count = await dao.count({ where });

      logger.info({ msg: "[data.count_records] Done", model, count });
      return { success: true, model, count, where };
    },
  },
];
