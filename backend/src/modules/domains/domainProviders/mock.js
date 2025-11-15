// Mock registrar (use for development / tests)
exports.registerDomainWithAPI = async (domain, opts = {}) => {
  console.log(`[MockRegistrar] Registering domain: ${domain}`, opts);
  return {
    success: true,
    expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    nameservers: ['ns1.mock.net', 'ns2.mock.net'],
    metadata: { provider: 'mock', createdBy: 'mock' }
  };
};

exports.cancelDomainWithAPI = async (domain) => {
  console.log(`[MockRegistrar] Cancelling domain at registrar: ${domain}`);
  return { success: true };
};
