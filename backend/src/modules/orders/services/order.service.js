/**
 * Order Service - Clean & Lightweight
 * Path: src/modules/orders/services/order.service.js
 * 
 * Features:
 * - Order CRUD operations
 * - State machine (pending → active → suspended/terminated)
 * - Immutable snapshots
 * - No auth/audit overhead
 */

const prisma = require("../../../../prisma");
const { createOrderSnapshot } = require("../utils/order.snapshot.util");

/**
 * Create new order with immutable snapshot
 * Status: pending
 */
async function createOrder(clientId, dto) {
  // Validate required fields
  if (!clientId || !dto.serviceId || !dto.planId || !dto.pricingId) {
    const err = new Error("Missing required fields: serviceId, planId, pricingId");
    err.statusCode = 400;
    throw err;
  }

  // Create immutable snapshot
  const snapshot = await createOrderSnapshot(dto);

  if (!snapshot) {
    const err = new Error("Failed to create order snapshot");
    err.statusCode = 400;
    throw err;
  }

  // Create order in pending state
  const order = await prisma.order.create({
    data: {
      clientId,
      snapshotId: snapshot.id,
      status: "pending",
    },
    include: { 
      snapshot: true, 
      client: { select: { id: true, email: true } } 
    },
  });

  return order;
}

/**
 * Get all orders for a client
 */
async function getClientOrders(clientId, options = {}) {
  const { limit = 50, offset = 0, status } = options;

  const where = { clientId };
  if (status) where.status = status;

  return prisma.order.findMany({
    where,
    include: { snapshot: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * Get order by ID
 * - Clients can only see their own orders
 * - Admins can see all orders
 */
async function getOrderById(orderId, requester) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { 
      snapshot: true, 
      client: { select: { id: true, email: true } } 
    },
  });

  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  // Prevent cross-client access (clients only)
  if (requester.role === "client" && order.clientId !== requester.userId) {
    const err = new Error("Unauthorized: You can only access your own orders");
    err.statusCode = 403;
    throw err;
  }

  return order;
}

/**
 * Cancel pending order (client action)
 * pending → cancelled (terminal)
 */
async function cancel(orderId, clientId) {
  const order = await prisma.order.findUnique({ 
    where: { id: orderId },
    include: { snapshot: true }
  });

  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  // Verify ownership
  if (order.clientId !== clientId) {
    const err = new Error("Unauthorized: You can only cancel your own orders");
    err.statusCode = 403;
    throw err;
  }

  // Only pending orders can be cancelled
  if (order.status !== "pending") {
    const err = new Error("Only pending orders can be cancelled");
    err.statusCode = 409;
    throw err;
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
    },
    include: { snapshot: true, client: { select: { id: true, email: true } } },
  });

  return updated;
}

/**
 * Activate pending order (admin action)
 * pending → active
 */
async function activate(orderId) {
  const order = await prisma.order.findUnique({ 
    where: { id: orderId },
    include: { snapshot: true }
  });

  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  if (order.status !== "pending") {
    const err = new Error("Only pending orders can be activated");
    err.statusCode = 409;
    throw err;
  }

  // Set start date and renewal date (30 days from now)
  const now = new Date();
  const nextRenewal = new Date(now);
  nextRenewal.setDate(nextRenewal.getDate() + 30);

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "active",
      startedAt: now,
      nextRenewalAt: nextRenewal,
    },
    include: { snapshot: true, client: { select: { id: true, email: true } } },
  });

  return updated;
}

/**
 * Renew order (extend renewal date)
 * active → active (extends renewal)
 */
async function renew(orderId) {
  const order = await prisma.order.findUnique({ 
    where: { id: orderId },
    include: { snapshot: true }
  });

  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  if (order.status !== "active") {
    const err = new Error("Only active orders can be renewed");
    err.statusCode = 409;
    throw err;
  }

  // Extend renewal date by 30 days
  const base = order.nextRenewalAt || new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + 30);

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { nextRenewalAt: next },
    include: { snapshot: true, client: { select: { id: true, email: true } } },
  });

  return updated;
}

/**
 * Suspend order (admin action)
 * active → suspended
 */
async function suspend(orderId) {
  const order = await prisma.order.findUnique({ 
    where: { id: orderId },
    include: { snapshot: true }
  });

  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  if (order.status !== "active") {
    const err = new Error("Only active orders can be suspended");
    err.statusCode = 409;
    throw err;
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "suspended",
      suspendedAt: new Date(),
    },
    include: { snapshot: true, client: { select: { id: true, email: true } } },
  });

  return updated;
}

/**
 * Resume order (admin action)
 * suspended → active
 */
async function resume(orderId) {
  const order = await prisma.order.findUnique({ 
    where: { id: orderId },
    include: { snapshot: true }
  });

  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  if (order.status !== "suspended") {
    const err = new Error("Only suspended orders can be resumed");
    err.statusCode = 409;
    throw err;
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "active",
      suspendedAt: null,
    },
    include: { snapshot: true, client: { select: { id: true, email: true } } },
  });

  return updated;
}

/**
 * Terminate order (admin action - terminal state)
 * * → terminated
 */
async function terminate(orderId) {
  const order = await prisma.order.findUnique({ 
    where: { id: orderId },
    include: { snapshot: true }
  });

  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  if (order.status === "terminated") {
    const err = new Error("Order already terminated");
    err.statusCode = 409;
    throw err;
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "terminated",
      terminatedAt: new Date(),
    },
    include: { snapshot: true, client: { select: { id: true, email: true } } },
  });

  return updated;
}

/**
 * Get all orders (admin only)
 */
async function adminListOrders(options = {}) {
  const { limit = 100, offset = 0, status, clientId } = options;

  const where = {};
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;

  return prisma.order.findMany({
    where,
    include: { snapshot: true, client: { select: { id: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

/**
 * Get order statistics
 */
async function getOrderStats() {
  const stats = await prisma.order.groupBy({
    by: ["status"],
    _count: {
      id: true,
    },
  });

  return stats.reduce((acc, curr) => {
    acc[curr.status] = curr._count.id;
    return acc;
  }, {});
}

/**
 * Get client's total spend
 */
async function getClientTotalSpend(clientId) {
  const orders = await prisma.order.findMany({
    where: { clientId },
    include: { snapshot: true },
  });

  let totalSpend = 0;
  orders.forEach(order => {
    const price = parseFloat(order.snapshot?.snapshot?.pricing?.price || 0);
    totalSpend += price;
  });

  return {
    clientId,
    totalOrders: orders.length,
    totalSpend: totalSpend.toFixed(2),
    orders: orders.length > 0 
      ? orders.map(o => ({
          id: o.id,
          status: o.status,
          price: o.snapshot?.snapshot?.pricing?.price,
          cycle: o.snapshot?.snapshot?.pricing?.cycle,
        }))
      : []
  };
}

module.exports = {
  createOrder,
  getClientOrders,
  getOrderById,
  cancel,
  activate,
  renew,
  suspend,
  resume,
  terminate,
  adminListOrders,
  getOrderStats,
  getClientTotalSpend,
};