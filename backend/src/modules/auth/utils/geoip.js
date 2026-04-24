const geoip = require("geoip-lite");

function resolveCountry(ip) {
  if (!ip || ip === "127.0.0.1") return "Local";

  try {
    const geo = geoip.lookup(ip);
    return geo?.country || "Unknown";
  } catch {
    return "Unknown";
  }
}

module.exports = { resolveCountry };
