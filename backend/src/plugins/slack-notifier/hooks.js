function makeHooks(notifier) {
  function onOrderCreated(payload) {
    const id     = payload?.orderId || payload?.id || "unknown";
    const amount = payload?.total   || payload?.amount || "?";
    const client = payload?.clientEmail || payload?.clientId || "unknown";
    notifier.send(
      `🛒 New order placed`,
      { "Order ID": id, "Amount": `$${amount}`, "Client": client },
      "good"
    );
  }

  function onInvoicePaid(payload) {
    const id     = payload?.invoiceId || payload?.id || "unknown";
    const amount = payload?.amount    || "?";
    const client = payload?.clientEmail || payload?.clientId || "unknown";
    notifier.send(
      `💰 Invoice paid`,
      { "Invoice ID": id, "Amount": `$${amount}`, "Client": client },
      "good"
    );
  }

  function onServiceProvision(payload) {
    const id   = payload?.serviceId || payload?.id || "unknown";
    const plan = payload?.plan      || "unknown";
    notifier.send(
      `⚙️ Service provisioned`,
      { "Service ID": id, "Plan": plan },
      "#36a64f"
    );
  }

  function onServiceSuspend(payload) {
    const id     = payload?.serviceId || payload?.id || "unknown";
    const reason = payload?.reason    || "no reason given";
    notifier.send(
      `⚠️ Service suspended`,
      { "Service ID": id, "Reason": reason },
      "warning"
    );
  }

  function onServiceTerminate(payload) {
    const id = payload?.serviceId || payload?.id || "unknown";
    notifier.send(
      `🔴 Service terminated`,
      { "Service ID": id },
      "danger"
    );
  }

  return { onOrderCreated, onInvoicePaid, onServiceProvision, onServiceSuspend, onServiceTerminate };
}

module.exports = makeHooks;
