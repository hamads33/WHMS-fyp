/**
 * Public Auth Controller
 * POST /public/v1/auth/login  — returns accessToken + refreshToken
 * GET  /public/v1/auth/me     — returns current user (requires Bearer token)
 */
const AuthService = require("../../auth/services/auth.service");
const TokenService = require("../../auth/services/token.service");
const prisma = require("../../../../prisma");

const AuthController = {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
      }

      const ip =
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.ip ||
        null;

      const result = await AuthService.login({
        email,
        password,
        ip,
        userAgent: req.headers["user-agent"] || null,
      });

      return res.json({
        success: true,
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (err) {
      if (
        err.message === "Invalid email or password" ||
        err.message?.includes("disabled") ||
        err.message?.includes("MFA")
      ) {
        return res.status(401).json({ error: err.message });
      }
      console.error("[Public] auth.login error:", err);
      return res.status(500).json({ error: "Login failed" });
    }
  },

  async me(req, res) {
    try {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

      if (!token) {
        return res.status(401).json({ error: "Bearer token required" });
      }

      let payload;
      try {
        payload = TokenService.verifyAccessToken(token);
      } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      if (!payload?.userId) {
        return res.status(401).json({ error: "Invalid token payload" });
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          createdAt: true,
          clientProfile: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.json({ success: true, user });
    } catch (err) {
      console.error("[Public] auth.me error:", err);
      return res.status(500).json({ error: "Failed to fetch user" });
    }
  },
};

module.exports = AuthController;
