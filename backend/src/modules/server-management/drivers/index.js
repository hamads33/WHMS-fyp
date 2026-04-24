const MockCpanelDriver = require("./mock-cpanel.driver");
const MockVpsDriver = require("./mock-vps.driver");
const MockCloudDriver = require("./mock-cloud.driver");

const DRIVER_MAP = {
  "mock-cpanel": MockCpanelDriver,
  "mock-vps": MockVpsDriver,
  "mock-cloud": MockCloudDriver,
};

function resolveDriver(server) {
  const DriverClass = DRIVER_MAP[server.type];
  if (!DriverClass) {
    const err = new Error(`Unsupported server type: ${server.type}`);
    err.statusCode = 400;
    throw err;
  }
  return new DriverClass(server);
}

module.exports = { resolveDriver, DRIVER_MAP };
