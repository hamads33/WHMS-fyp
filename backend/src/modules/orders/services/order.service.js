
// ============================================================================
// FILE 4: order.service.js
// ============================================================================
// Path: src/modules/orders/services/order.service.js

const prisma = require("../../../../prisma");
const { createOrderSnapshot } = require("../utils/order.snapshot.util");

/**
 * Create a new order (Client)
 * Status: pending
 */
async function createOrder(clientId, dto) {
  const snapshot = await createOrderSnapshot(dto);

  return prisma.order.create({
    data: {
      clientId,
      snapshotId: snapshot.id,
      status: "pending",
    },
  });
}

/**
 * List orders for a specific client
 */
async function getClientOrders(clientId) {
  return prisma.order.findMany({
    where: { clientId },
    include: { snapshot: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get single order (Client or Admin)
 */
async function getOrderById(orderId, requester) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { snapshot: true },
  });

  if (!order) {
    const e = new Error("Order not found");
    e.statusCode = 404;
    throw e;
  }

  // Client access restriction
  if (
    requester.role === "client" &&
    order.clientId !== requester.userId
  ) {
    const e = new Error("Unauthorized access");
    e.statusCode = 403;
    throw e;
  }

  return order;
}

/**
 * Cancel order (Client action - pending orders only)
 * pending → cancelled
 */
async function cancel(orderId, clientId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    const e = new Error("Order not found");
    e.statusCode = 404;
    throw e;
  }

  // Verify ownership
  if (order.clientId !== clientId) {
    const e = new Error("Unauthorized: You can only cancel your own orders");
    e.statusCode = 403;
    throw e;
  }

  // Only pending orders can be cancelled by clients
  if (order.status !== "pending") {
    const e = new Error("Only pending orders can be cancelled");
    e.statusCode = 409;
    throw e;
  }

  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
    },
  });
}

/**
 * Activate order (Admin / system)
 * pending → active
 */
async function activate(orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    const e = new Error("Order not found");
    e.statusCode = 404;
    throw e;
  }

  if (order.status !== "pending") {
    const e = new Error("Only pending orders can be activated");
    e.statusCode = 409;
    throw e;
  }

  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: "active",
      startedAt: new Date(),
      nextRenewalAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

/**
 * Renew order
 * active → active (extend renewal)
 */
async function renew(orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    const e = new Error("Order not found");
    e.statusCode = 404;
    throw e;
  }

  if (order.status !== "active") {
    const e = new Error("Only active orders can be renewed");
    e.statusCode = 409;
    throw e;
  }

  const base = order.nextRenewalAt || new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + 30);

  return prisma.order.update({
    where: { id: orderId },
    data: { nextRenewalAt: next },
  });
}

/**
 * Suspend order
 * active → suspended
 */
async function suspend(orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    const e = new Error("Order not found");
    e.statusCode = 404;
    throw e;
  }

  if (order.status !== "active") {
    const e = new Error("Only active orders can be suspended");
    e.statusCode = 409;
    throw e;
  }

  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: "suspended",
      suspendedAt: new Date(),
    },
  });
}

/**
 * Resume order
 * suspended → active
 */
async function resume(orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    const e = new Error("Order not found");
    e.statusCode = 404;
    throw e;
  }

  if (order.status !== "suspended") {
    const e = new Error("Only suspended orders can be resumed");
    e.statusCode = 409;
    throw e;
  }

  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: "active",
      suspendedAt: null,
    },
  });
}

/**
 * Terminate order (terminal state)
 */
async function terminate(orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    const e = new Error("Order not found");
    e.statusCode = 404;
    throw e;
  }

  if (order.status === "terminated") {
    const e = new Error("Order already terminated");
    e.statusCode = 409;
    throw e;
  }

  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: "terminated",
      terminatedAt: new Date(),
    },
  });
}

/**
 * List all orders (Admin)
 */
async function adminListOrders() {
  return prisma.order.findMany({
    include: { snapshot: true, client: true },
    orderBy: { createdAt: "desc" },
  });
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
};
