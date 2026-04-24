/**
 * Public Clients Controller
 * POST /public/v1/clients  — register a new client account
 */
const AuthService = require("../../auth/services/auth.service");

const ClientsController = {
  async create(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "password must be at least 8 characters" });
      }

      const user = await AuthService.register({ email, password });

      return res.status(201).json({ success: true, client: user });
    } catch (err) {
      if (err.message === "Email already registered") {
        return res.status(409).json({ error: err.message });
      }
      console.error("[Public] clients.create error:", err);
      return res.status(500).json({ error: "Registration failed" });
    }
  },
};

module.exports = ClientsController;
