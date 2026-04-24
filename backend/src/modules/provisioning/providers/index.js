const HostingProvider = require("./hosting.provider");
const {
  CyberPanelProvider,
  createCyberPanelProvider,
  syncCyberPanelState,
} = require("./cyberpanel/cyberpanel.provider");

const PROVIDER_REGISTRY = Object.freeze({
  cyberpanel: createCyberPanelProvider,
});

function createHostingProvider(providerName, options = {}) {
  const factory = PROVIDER_REGISTRY[String(providerName || "").toLowerCase()];
  if (!factory) {
    const err = new Error(`Unsupported hosting provider: "${providerName}"`);
    err.statusCode = 400;
    throw err;
  }
  return factory(options);
}

module.exports = {
  HostingProvider,
  CyberPanelProvider,
  createCyberPanelProvider,
  createHostingProvider,
  syncCyberPanelState,
  PROVIDER_REGISTRY,
};
