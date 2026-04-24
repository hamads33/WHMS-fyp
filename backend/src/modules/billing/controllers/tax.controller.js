/**
 * Tax Controller
 * Path: src/modules/billing/controllers/tax.controller.js
 */

const taxService = require("../services/tax.service");

/**
 * GET /admin/billing/tax-rules
 */
exports.list = async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const rules = await taxService.listAll(activeOnly === "true");
    res.json({ success: true, count: rules.length, rules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /admin/billing/tax-rules/:id
 */
exports.get = async (req, res) => {
  try {
    const rule = await taxService.getById(parseInt(req.params.id));
    res.json({ success: true, rule });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * POST /admin/billing/tax-rules
 * Body: { name, rate, country?, region?, serviceType? }
 */
exports.create = async (req, res) => {
  try {
    const rule = await taxService.create(req.body, req.user?.id);
    res.status(201).json({ success: true, rule });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * PUT /admin/billing/tax-rules/:id
 */
exports.update = async (req, res) => {
  try {
    const rule = await taxService.update(parseInt(req.params.id), req.body, req.user?.id);
    res.json({ success: true, rule });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /admin/billing/tax-rules/:id
 */
exports.delete = async (req, res) => {
  try {
    const result = await taxService.delete(parseInt(req.params.id), req.user?.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

/**
 * POST /admin/billing/tax-rules/preview
 * Preview tax calculation for a given amount, client, and serviceType.
 *
 * Body: { clientId, subtotal, serviceType? }
 */
exports.preview = async (req, res) => {
  try {
    const { clientId, subtotal, serviceType } = req.body;

    if (!clientId || !subtotal) {
      return res.status(400).json({
        success: false,
        error: "clientId and subtotal are required",
      });
    }

    const result = await taxService.calculate(
      parseFloat(subtotal),
      clientId,
      serviceType || null
    );

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};