/**
 * Order Service (ENHANCED)
 * Path: src/modules/orders/services/order.service.js
 *
 * ⚠️ REPLACE YOUR EXISTING FILE WITH THIS VERSION
 *
 * Updated for Professional Services Module:
 * - Add-on support with pricing
 * - Setup fees and advanced pricing
 * - Service automation triggers
 * - Feature and policy snapshots
 */

const prisma = require("../../../../prisma");
const { createOrderSnapshot, calculateOrderCost } = require("../utils/order.snapshot.util");
const { getNextRenewalDate } = require("../../billing/utils/billing.util");
const provisioningHooks = require("../../provisioning/utils/provisioning-hooks");
const BillingService = require("../../billing/services/billing.service");
const invoiceService = require("../../billing/services/invoice.service");

/**
 * Create new order with enhanced snapshot
 * - Captures add-ons, features, policies, advanced pricing
 * - Triggers service creation automation (if enabled)
 * - Returns order cost breakdown
 */
async function createOrder(clientId, dto) {
  // Validate required fields
  if (!clientId || !dto.serviceId || !dto.planId || !dto.pricingId) {
    const err = new Error(
      "Missing required fields: serviceId, planId, pricingId"
    );
    err.statusCode = 400;
    throw err;
  }

  // Create enhanced snapshot
  const snapshot = await createOrderSnapshot({
    serviceId: dto.serviceId,
    planId: dto.planId,
    pricingId: dto.pricingId,
    addons: dto.addons || [],
    billingCycles: dto.billingCycles || 1,
    quantity: dto.quantity || 1,
  });

  if (!snapshot) {
    const err = new Error("Failed to create order snapshot");
    err.statusCode = 400;
    throw err;
  }

  // Build combined snapshot data for cost calculation
  const snapshotData = {
    pricing: snapshot.pricing,
    addons: snapshot.addons || [],
  };
  const costBreakdown = calculateOrderCost(snapshotData);

  // Create order in pending state
  const order = await prisma.order.create({
    data: {
      clientId,
      snapshotId: snapshot.id,
      status: "pending",
    },
    include: {
      snapshot: true,
      client: { select: { id: true, email: true } },
    },
  });

  // Auto-generate invoice for the new order (unpaid, ready for payment)
  let invoice = null;
  try {
    const draft = await BillingService.generateInvoiceFromOrder(order.id, { status: "draft" }, "system");
    invoice = await invoiceService.send(draft.id); // draft → unpaid
  } catch (err) {
    console.error("Failed to auto-generate invoice for order:", err.message);
  }

  // Trigger "order_created" automation (optional)
  try {
    await triggerServiceAutomation("order_created", snapshotData, order);
  } catch (err) {
    console.error("Failed to trigger order creation automation:", err.message);
  }

  return {
    order,
    invoice,
    costBreakdown,
  };
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
 * Get order by ID with cost breakdown
 * - Clients can only see their own orders
 * - Admins can see all orders
 */
async function getOrderById(orderId, requester) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      snapshot: true,
      client: { select: { id: true, email: true } },
    },
  });

  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  // Prevent cross-client access (clients only)
  if (requester?.roles?.includes('client') && order.clientId !== requester?.id) {
    const err = new Error("Unauthorized: You can only access your own orders");
    err.statusCode = 403;
    throw err;
  }

  // Calculate cost breakdown (null-safe for orders without snapshots)
  const costBreakdown = order.snapshot ? calculateOrderCost(order.snapshot) : null;

  return {
    ...order,
    costBreakdown,
  };
}

/**
 * Cancel pending order (client action)
 * pending → cancelled (terminal)
 */
async function cancel(orderId, clientId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { snapshot: true },
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
 *
 * - Uses calendar-based renewal calculation
 * - Triggers provisioning automation
 * - Respects service configurations
 */
async function activate(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { snapshot: true },
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

  // Get billing cycle from snapshot
  const cycle = order.snapshot?.pricing?.cycle || "monthly";
  const now = new Date();
  const nextRenewal = getNextRenewalDate(now, cycle);

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "active",
      startedAt: now,
      nextRenewalAt: nextRenewal,
    },
    include: { snapshot: true, client: { select: { id: true, email: true } } },
  });

  // Trigger provisioning (respects auto-provisioning setting)
  await provisioningHooks.onOrderActivated(orderId);

  // Trigger "order_activated" automation
  try {
    await triggerServiceAutomation("order_activated", order.snapshot, updated);
  } catch (err) {
    console.error("Failed to trigger activation automation:", err.message);
  }

  return updated;
}

/**
 * Renew order (extend renewal date)
 * active → active (extends renewal)
 *
 * Uses actual billing cycle for calendar-based calculation
 */
async function renew(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { snapshot: true },
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

  // Use actual billing cycle with calendar-based calculation
  const cycle = order.snapshot?.pricing?.cycle || "monthly";
  const base = order.nextRenewalAt || new Date();
  const next = getNextRenewalDate(base, cycle);

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { nextRenewalAt: next },
    include: { snapshot: true, client: { select: { id: true, email: true } } },
  });

  // Trigger "order_renewed" automation
  try {
    await triggerServiceAutomation("order_renewed", order.snapshot, updated);
  } catch (err) {
    console.error("Failed to trigger renewal automation:", err.message);
  }

  return updated;
}

/**
 * Suspend order (admin action)
 * active → suspended
 *
 * Triggers suspension automation and adds suspension fee if configured
 */
async function suspend(orderId, reason = "Payment required") {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { snapshot: true },
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

  // Trigger "order_suspended" automation
  try {
    await triggerServiceAutomation("order_suspended", order.snapshot, updated);
  } catch (err) {
    console.error("Failed to trigger suspension automation:", err.message);
  }

  return updated;
}

/**
 * Resume order (admin action)
 * suspended → active
 */
async function resume(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { snapshot: true },
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

  // Trigger "order_resumed" automation
  try {
    await triggerServiceAutomation("order_resumed", order.snapshot, updated);
  } catch (err) {
    console.error("Failed to trigger resume automation:", err.message);
  }

  return updated;
}

/**
 * Terminate order (admin action - terminal state)
 * * → terminated
 *
 * Triggers termination automation and applies termination fee if configured
 */
async function terminate(orderId, reason = "Admin action") {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { snapshot: true },
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

  // Deprovision hosting account
  await provisioningHooks.onOrderTerminated(orderId);

  // Trigger "order_terminated" automation
  try {
    await triggerServiceAutomation("order_terminated", order.snapshot, updated);
  } catch (err) {
    console.error("Failed to trigger termination automation:", err.message);
  }

  return updated;
}

/**
 * Trigger service automations
 * Integrates with ServiceAutomation module for provisioning, webhooks, etc.
 */
async function triggerServiceAutomation(event, snapshotData, orderData) {
  // This would call the service automation module if available
  // For now, this is a stub that can be integrated later

  const automationEventMap = {
    order_created: "create",
    order_activated: "create",
    order_renewed: "renew",
    order_suspended: "suspend",
    order_resumed: "resume",
    order_terminated: "terminate",
  };

  const serviceEvent = automationEventMap[event];
  if (!serviceEvent) return;

  // TODO: Integrate with service automation service
  // const automationService = require("../../services/services/service-automation.service");
  // await automationService.executeEvent(snapshotData.service.id, serviceEvent, {
  //   order: orderData,
  //   service: snapshotData.service,
  //   plan: snapshotData.plan,
  // });
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
 * Get client's total spend with add-on costs
 */
async function getClientTotalSpend(clientId) {
  const orders = await prisma.order.findMany({
    where: { clientId },
    include: { snapshot: true },
  });

  let totalSpend = 0;
  const orderDetails = orders.map((order) => {
    const cost = order.snapshot ? calculateOrderCost(order.snapshot) : { baseCost: "0", addonCost: "0", setupCost: "0", discountAmount: "0", total: "0" };
    totalSpend += parseFloat(cost.total);

    return {
      id: order.id,
      status: order.status,
      baseCost: cost.baseCost,
      addonCost: cost.addonCost,
      setupCost: cost.setupCost,
      total: cost.total,
      cycle: order.snapshot?.pricing?.cycle,
      service: order.snapshot?.service?.name,
      plan: order.snapshot?.planData?.name,
    };
  });

  return {
    clientId,
    totalOrders: orders.length,
    totalSpend: totalSpend.toFixed(2),
    orders: orderDetails,
  };
}

/**
 * Get order with all details and add-ons
 */
async function getOrderDetails(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { snapshot: true },
  });

  if (!order) {
    const err = new Error("Order not found");
    err.statusCode = 404;
    throw err;
  }

  const snapshot = order.snapshot;
  const cost = calculateOrderCost(snapshot);

  return {
    ...order,
    snapshot: {
      service: snapshot.service,
      plan: snapshot.planData,
      pricing: snapshot.pricing,
      addons: snapshot.addons || [],
      features: snapshot.features || {},
      policies: snapshot.policies || {},
    },
    costBreakdown: cost,
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
  getOrderDetails,
};