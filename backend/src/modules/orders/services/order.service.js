const prisma = require("../../../../prisma");
const { createOrderSnapshot } = require("../utils/order.snapshot.util");

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

async function getClientOrders(clientId) {
  return prisma.order.findMany({
    where: { clientId },
    include: { snapshot: true },
    orderBy: { createdAt: "desc" },
  });
}

async function getOrderById(orderId, requester) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { snapshot: true },
  });

  if (!order) throw new Error("Order not found");

  // Client access restriction
  if (requester.role === "client" && order.clientId !== requester.userId) {
    throw new Error("Unauthorized access");
  }

  return order;
}

async function cancelOrder(orderId, clientId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) throw new Error("Order not found");
  if (order.clientId !== clientId) throw new Error("Unauthorized");

  if (order.status !== "pending") {
    throw new Error("Only pending orders can be cancelled");
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { status: "cancelled" },
  });
}

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
  cancelOrder,
  adminListOrders,
};
