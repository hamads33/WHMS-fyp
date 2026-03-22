/**
 * requireScope middleware
 * Verifies that the API key (set by apiKeyGuard) has the required scope.
 * Skips scope check when no scopes are stored (unrestricted key).
 */
function requireScope(scope) {
  return (req, res, next) => {
    const key = req.apiKey;
    if (!key) return res.status(401).json({ error: "API key required" });

    // If key has no scopes defined, treat as unrestricted
    const scopes = key.scopes || [];
    if (scopes.length === 0) return next();

    const scopeValues = scopes.map((s) =>
      typeof s === "string" ? s : s.scope
    );

    if (!scopeValues.includes(scope)) {
      return res.status(403).json({
        error: `Insufficient scope. Required: ${scope}`,
      });
    }

    return next();
  };
}

module.exports = { requireScope };
