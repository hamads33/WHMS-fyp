/**
 * Hooks — listen to core lifecycle events and record them in the service.
 */
module.exports = function makeHooks(analytics) {
  return {
    onOrderCreated    : (payload) => analytics.record("order.created",     payload?.orderId    ?? ""),
    onInvoicePaid     : (payload) => analytics.record("invoice.paid",      payload?.invoiceId  ?? ""),
    onServiceProvision: (payload) => analytics.record("service.provision", payload?.serviceId  ?? ""),
    onServiceSuspend  : (payload) => analytics.record("service.suspend",   payload?.serviceId  ?? ""),
    onServiceTerminate: (payload) => analytics.record("service.terminate", payload?.serviceId  ?? ""),
  };
};
