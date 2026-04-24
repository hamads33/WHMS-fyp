/**
 * publicClientAuth middleware
 *
 * Validates a client's own JWT (obtained from POST /public/v1/auth/login).
 * Sets req.publicClientId to the user's ID for downstream controllers.
 *
 * This is separate from the server-level apiKeyGuard — the API key
 * authenticates the *developer* embedding the widget; this middleware
 * authenticates the *end-user* making the request.
 */
const TokenService = require("../../auth/services/token.service");

async function publicClientAuth(req, res, next) {
  try {
    const authHeader = req.headers["x-client-token"] || req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader || null;

    if (!token) {
      return res.status(401).json({ error: "Client token required (x-client-token or Authorization: Bearer)" });
    }

    let payload;
    try {
      payload = TokenService.verifyAccessToken(token);
    } catch {
      return res.status(401).json({ error: "Invalid or expired client token" });
    }

    if (!payload?.userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.publicClientId = payload.userId;
    return next();
  } catch (err) {
    console.error("[publicClientAuth] error:", err);
    return res.status(401).json({ error: "Authentication failed" });
  }
}

module.exports = { publicClientAuth };
