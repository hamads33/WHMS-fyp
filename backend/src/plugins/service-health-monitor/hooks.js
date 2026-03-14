function makeHooks(monitor, logger) {
  function onServiceProvision(payload) {
    const id = payload?.serviceId || payload?.id || "unknown";
    monitor.onProvision(id, { plan: payload?.plan, clientId: payload?.clientId });
  }

  function onServiceSuspend(payload) {
    const id = payload?.serviceId || payload?.id || "unknown";
    monitor.onSuspend(id, { reason: payload?.reason });
  }

  function onServiceTerminate(payload) {
    const id = payload?.serviceId || payload?.id || "unknown";
    monitor.onTerminate(id, { reason: payload?.reason });
  }

  function onCronHourly() {
    monitor.runHealthCheck();
  }

  return { onServiceProvision, onServiceSuspend, onServiceTerminate, onCronHourly };
}

module.exports = makeHooks;
