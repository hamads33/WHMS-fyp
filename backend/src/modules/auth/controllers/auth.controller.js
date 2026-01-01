// src/modules/auth/controllers/auth.controller.js
const AuthService = require("../services/auth.service");
const AuthEvents = require("../services/authEvents");
const EmailTokenService = require("../services/emailToken.service");

class AuthController {
  // ======================================================
  // REGISTER
  // ======================================================
  static async register(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      // 1 Create user (core business logic)
      const user = await AuthService.register({ email, password });

      // 2 Emit auth domain event
      AuthEvents.register(user);

      // 3 Send verification email (side-effect, correct layer)
      await EmailTokenService.sendVerificationEmail(
        user,
        process.env.FRONTEND_ORIGIN
      );

      // 4️⃣ Respond (do NOT expose token)
      return res.status(201).json({
        message: "Registration successful. Please verify your email.",
        user,
      });
    } catch (err) {
      console.error("REGISTER ERROR:", err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  // ======================================================
  // LOGIN – Cookies + Tokens (Postman friendly)
  // ======================================================
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      const { accessToken, refreshToken, user } =
        await AuthService.login({
          email,
          password,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
        });

      // 🔔 AUTH EVENT (SUCCESS)
      AuthEvents.loginSuccess(user, {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      const cookieOptions = {
        httpOnly: true,
        secure: false, // true in production (HTTPS)
        sameSite: "lax",
        path: "/",
      };

      res.cookie("access_token", accessToken, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 15,
      });

      res.cookie("refresh_token", refreshToken, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });

      return res.status(200).json({
        message: "Login successful",
        user,
        accessToken,
        refreshToken,
      });
    } catch (err) {
      // 🔔 AUTH EVENT (FAILURE)
      AuthEvents.loginFailed(req.body?.email, err.message);

      console.error("LOGIN ERROR:", err.message);
      return res.status(401).json({ error: err.message });
    }
  }

  // ======================================================
  // REFRESH TOKEN
  // ✅ UPDATED: Now passes ip and userAgent to service
  // ======================================================
  static async refresh(req, res) {
    try {
      const refreshToken =
        req.cookies?.refresh_token || req.body?.refreshToken;

      if (!refreshToken) {
        return res.status(400).json({ error: "refreshToken is required" });
      }

      // ✅ Pass ip and userAgent to service
      const { accessToken, refreshToken: newRefresh } =
        await AuthService.refresh({ 
          refreshToken,
          ip: req.ip,
          userAgent: req.get("User-Agent")
        });

      const cookieOptions = {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
      };

      res.cookie("access_token", accessToken, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 15,
      });

      res.cookie("refresh_token", newRefresh, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });

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
  // LOGOUT
  // ======================================================
  static async logout(req, res) {
    try {
      const refreshToken =
        req.cookies?.refresh_token || req.body?.refreshToken;

      if (!refreshToken) {
        return res.status(400).json({ error: "refreshToken is required" });
      }

      await AuthService.logout(refreshToken);

      // 🔔 AUTH EVENT
      if (req.user?.id) {
        AuthEvents.logout(req.user.id);
      }

      res.clearCookie("access_token");
      res.clearCookie("refresh_token");

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
  // ME – Protected
  // ======================================================
  static async me(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      return res.json({
        user: req.user,
      });
    } catch (err) {
      console.error("ME ERROR:", err.message);
      return res.status(500).json({ error: "Something went wrong" });
    }
  }
}

module.exports = AuthController;