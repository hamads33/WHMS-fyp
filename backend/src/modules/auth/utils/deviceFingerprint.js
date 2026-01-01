const crypto = require("crypto");

function hashDevice({ userAgent, ip }) {
  if (!userAgent && !ip) return null;

  const raw = `${userAgent || ""}|${ip || ""}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

module.exports = { hashDevice };
