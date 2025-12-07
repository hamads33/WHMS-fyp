// src/modules/auth/controllers/ipRules.controller.js
const IpAccessService = require("../services/ipAccess.service");

const IpRulesController = {
  async create(req, res) {
    try {
      const { pattern, type, description } = req.body;
      if (!pattern || !type)
        return res.status(400).json({ error: "pattern and type are required" });

      const rule = await IpAccessService.createRule({
        pattern,
        type: type.toUpperCase(), // ensure ENUM matches Prisma
        description,
        createdById: req.user?.id || null,
      });

      return res.json({ success: true, rule });
    } catch (err) {
      console.error("IP rule create error:", err);
      return res.status(500).json({ error: err.message });
    }
  },

  async list(req, res) {
    try {
      const rules = await IpAccessService.listRules({ activeOnly: false });
      return res.json({ success: true, rules });
    } catch (err) {
      console.error("IP rule list error:", err);
      return res.status(500).json({ error: err.message });
    }
  },

async update(req, res) {
  try {
    const id = Number(req.params.id);

    // Load existing rule to ensure fallback values
    const existing = await IpAccessService.getRule(id);
    if (!existing) return res.status(404).json({ error: "Rule not found" });

    const patch = {};

    if (typeof req.body.pattern === "string") {
      patch.pattern = req.body.pattern;
    }

    if (typeof req.body.description === "string") {
      patch.description = req.body.description;
    }

    if (req.body.active !== undefined) {
      patch.active = req.body.active === true || req.body.active === "true";
    }

    // ENUM – fallback to existing type to avoid Prisma crash
    if (req.body.type !== undefined) {
      patch.type = String(req.body.type).toUpperCase();
    } else {
      patch.type = existing.type; // ⭐ REQUIRED FIX
    }

    // Prevent invalid fields
    delete patch.id;
    delete patch.createdAt;
    delete patch.updatedAt;
    delete patch.createdById;

    const updated = await IpAccessService.updateRule(id, patch);
    return res.json({ success: true, rule: updated });

  } catch (err) {
    console.error("IP rule update error:", err);
    return res.status(500).json({ error: err.message });
  }
}

,

  async remove(req, res) {
    try {
      const id = Number(req.params.id);
      await IpAccessService.deleteRule(id);
      return res.json({ success: true });
    } catch (err) {
      console.error("IP rule delete error:", err);
      return res.status(500).json({ error: err.message });
    }
  },
};

module.exports = IpRulesController;
