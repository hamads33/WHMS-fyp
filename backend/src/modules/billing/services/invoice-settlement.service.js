const prisma = require("../../../../prisma");
const { getNextRenewalDate } = require("../utils/billing.util");
const provisioningHooks = require("../../provisioning/utils/provisioning-hooks");

async function activatePendingOrder(orderId) {
  const orderService = require("../../orders/services/order.service");
  return orderService.activate(orderId);
}

async function settlePaidInvoice(invoiceId) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      order: {
        include: {
          snapshot: true,
        },
      },
    },
  });

  if (!invoice?.orderId || !invoice.order) {
    return { action: "none", reason: "no_order" };
  }

  const order = invoice.order;
  const invoiceType = invoice.metadata?.type || "manual";
  const cycle = order.snapshot?.pricing?.cycle || "monthly";
  const now = invoice.paidAt || new Date();

  if (invoiceType === "new_order" && order.status === "pending") {
    await activatePendingOrder(order.id);
    return { action: "activated", orderId: order.id };
  }

  if (invoiceType === "renewal") {
    const baseDate =
      order.nextRenewalAt && new Date(order.nextRenewalAt) > now
        ? new Date(order.nextRenewalAt)
        : now;
    const nextRenewalAt = getNextRenewalDate(baseDate, cycle);

    const data = { nextRenewalAt };
    if (order.status === "suspended") {
      data.status = "active";
      data.suspendedAt = null;
    }

    await prisma.order.update({
      where: { id: order.id },
      data,
    });

    if (order.status === "suspended") {
      await provisioningHooks.onInvoicePaid(invoice.id, order.id);
      return { action: "resumed_and_renewed", orderId: order.id, nextRenewalAt };
    }

    return { action: "renewed", orderId: order.id, nextRenewalAt };
  }

  if (order.status === "suspended") {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "active",
        suspendedAt: null,
      },
    });
    await provisioningHooks.onInvoicePaid(invoice.id, order.id);
    return { action: "resumed", orderId: order.id };
  }

  return { action: "none", orderId: order.id, reason: "no_state_change" };
}

module.exports = {
  settlePaidInvoice,
};
