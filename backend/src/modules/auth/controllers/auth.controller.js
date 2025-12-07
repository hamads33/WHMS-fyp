// src/modules/auth/controllers/auth.controller.js

const AuthService = require("../services/auth.service");

/**
 * Full AuthController
 * - Register
 * - Login (with cookies for localhost)
 * - Refresh token
 * - Logout
 * - Me
 */
class AuthController {

  // ======================================================
  // REGISTER
  // ======================================================
  static async register(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await AuthService.register({ email, password });

      return res.status(201).json({
        message: "Registration successful",
        user,
      });
    } catch (err) {
      console.error("REGISTER ERROR:", err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  // ======================================================
  // LOGIN — FIXED COOKIE BEHAVIOR FOR LOCALHOST
  // ======================================================
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // AuthService returns: { accessToken, refreshToken, user }
      const { accessToken, refreshToken, user } = await AuthService.login({
        email,
        password,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // ⚡ Cookie settings that ACTUALLY work for localhost cross-port
      const cookieOptions = {
        httpOnly: true,
        secure: false,      // only true on HTTPS domain
        sameSite: "lax",    // required for localhost:3000 → 4000
        path: "/",
      };

      // Set cookies
      res.cookie("access_token", accessToken, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 15, // 15 min
      });

      res.cookie("refresh_token", refreshToken, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      });

      console.log("✔ LOGIN SUCCESS — Cookies set.");

      return res.status(200).json({
        message: "Login successful",
        user,
      });

    } catch (err) {
      console.error("LOGIN ERROR:", err.message);
      return res.status(401).json({ error: err.message });
    }
  }

  // ======================================================
  // REFRESH TOKEN — ROTATE TOKENS SAFELY
  // ======================================================
  static async refresh(req, res) {
    try {
      const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;

      if (!refreshToken) {
        return res.status(400).json({ error: "refreshToken is required" });
      }

      const { accessToken, refreshToken: newRefresh } =
        await AuthService.refresh({ refreshToken });

      const cookieOptions = {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
      };

      // Replace old token with rotated ones
      res.cookie("access_token", accessToken, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 15,
      });

      res.cookie("refresh_token", newRefresh, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });

      console.log("✔ REFRESH TOKEN ROTATED");

      return res.json({
        accessToken,
        refreshToken: newRefresh,
      });

    } catch (err) {
      console.error("REFRESH ERROR:", err.message);
      return res.status(401).json({ error: err.message });
    }
  }

  // ======================================================
  // LOGOUT — CLEAR COOKIES + REVOKE REFRESH TOKEN
  // ======================================================
  static async logout(req, res) {
    try {
      const refreshToken =
        req.cookies?.refresh_token || req.body?.refreshToken;

      if (!refreshToken) {
        return res.status(400).json({ error: "refreshToken is required" });
      }

      await AuthService.logout(refreshToken);

      // Clear cookies
      res.clearCookie("access_token");
      res.clearCookie("refresh_token");

      console.log("✔ LOGOUT — Tokens removed");

      return res.json({
        success: true,
        message: "Logged out successfully",
      });

    } catch (err) {
      console.error("LOGOUT ERROR:", err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  // ======================================================
  // ME — Protected route
  // ======================================================
  static async me(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    return res.json({
      user: req.user,   // includes roles, portals, profiles, impersonation
    });

  } catch (err) {
    console.error("ME ERROR:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

}

module.exports = AuthController;
