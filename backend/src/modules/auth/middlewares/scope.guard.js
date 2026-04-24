function scopeGuard(requiredScope) {
  return (req, res, next) => {
    const apiKey = req.apiKey;
    if (!apiKey) return res.status(401).json({ error: "No API key" });

    const scopes = apiKey.scopes.map(s => s.scope);

    if (!scopes.includes(requiredScope)) {
      return res.status(403).json({ error: "Missing required scope" });
    }

    return next();
  };
}

module.exports = { scopeGuard };

