const path = require("path");

function loadRegistrar(name) {
  try {
    // Load registrar as a module folder (mock/, porkbun/, etc.)
    return require(path.join(__dirname, name));
  } catch (err) {
    throw new Error(`Registrar not found: ${name}`);
  }
}

/**
 * Load registrar with automatic fallback to mock if credentials are missing
 * Returns { module, isMock, reason }
 */
async function loadRegistrarWithFallback(name) {
  if (name === "mock") {
    return { module: loadRegistrar("mock"), isMock: true, reason: null };
  }

  try {
    const mod = loadRegistrar(name);

    // Check if registrar has credentials
    if (typeof mod.hasCredentials === "function") {
      const ok = await mod.hasCredentials();
      if (!ok) {
        return {
          module: loadRegistrar("mock"),
          isMock: true,
          reason: `${name} API credentials are not configured. Using mock registrar — results are simulated and no real domain is registered.`
        };
      }
    }

    return { module: mod, isMock: false, reason: null };
  } catch (err) {
    return {
      module: loadRegistrar("mock"),
      isMock: true,
      reason: `Could not load registrar "${name}": ${err.message}. Using mock registrar.`
    };
  }
}

module.exports = { loadRegistrar, loadRegistrarWithFallback };
