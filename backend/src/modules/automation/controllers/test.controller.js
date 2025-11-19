// src/modules/automation/controllers/test.controller.js

const registry = require('../pluginEngine/pluginRegistry');
const { validateConfig } = require('../pluginEngine/validator');

async function testAction(req, res, next) {
  try {
    const { actionId } = req.params;

    // FIX: registry.getAction() → registry.get()
    const plugin = registry.get(actionId);

    if (!plugin) {
      return res.status(404).json({ message: `Plugin/Action not found: ${actionId}` });
    }

    const input = req.body || {};

    const schema = plugin.schema || plugin.jsonSchema || null;
    const { valid, errors, pretty } = validateConfig(schema, input);

    if (!valid) {
      return res.status(400).json({
        ok: false,
        error: "Schema validation failed",
        details: pretty || errors
      });
    }

    // FIX: plugin.test() signature requires (ctx, config)
    const output = plugin.test
      ? await plugin.test({ actionId, test: true }, input)
      : await plugin.execute({ actionId, test: true }, input);

    return res.json({ ok: true, runResult: output });

  } catch (err) {
    console.error("🔥 Test Action Error:", err);
    next(err);
  }
}

module.exports = { testAction };
