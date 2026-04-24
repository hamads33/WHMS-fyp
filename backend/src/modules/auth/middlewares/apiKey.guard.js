const ApiKeyService = require("../services/apiKey.service");
const prisma = require("../../../../prisma/index");

async function apiKeyGuard(req, res, next) {
  try {
    const rawKey =
      req.headers["x-api-key"] ||
      (req.headers.authorization || "").replace("Bearer ", "");

    if (!rawKey)
      return res.status(401).json({ error: "API key required" });

    // Try full key first (new keys have pk_test_/pk_live_ prefix baked in).
    // Fall back to stripping known prefixes for backward-compat with old keys.
    let key = await ApiKeyService.verify(rawKey);
    if (!key && /^pk_(test|live)_/.test(rawKey)) {
      const stripped = rawKey.replace(/^pk_(test|live)_/, "");
      key = await ApiKeyService.verify(stripped);
    }
    if (!key)
      return res.status(401).json({ error: "Invalid or expired API key" });

    const user = await prisma.user.findUnique({ where: { id: key.userId } });

    req.user = user;
    req.apiKey = key;

    return next();
  } catch (err) {
    console.error("apiKeyGuard error:", err);
    return res.status(401).json({ error: "API key auth failed" });
  }
}

module.exports = { apiKeyGuard };
