exports.buildServiceSnapshot = (service, plan, pricing) => ({
  service: {
    id: service.id,
    code: service.code,
    name: service.name,
  },
  plan,
  pricing,
  capturedAt: new Date().toISOString(),
});
