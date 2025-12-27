const path = require("path");

function loadRegistrar(name) {
  try {
    // Load registrar as a module folder (mock/, porkbun/, etc.)
    return require(path.join(__dirname, name));
  } catch (err) {
    throw new Error(`Registrar not found: ${name}`);
  }
}

module.exports = { loadRegistrar };
