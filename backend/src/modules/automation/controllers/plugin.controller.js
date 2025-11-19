// src/modules/automation/controllers/plugin.controller.js
// GET /plugins — lists user/builtin plugin meta
// src/modules/automation/controllers/plugin.controller.js
// GET /plugins — lists user/builtin plugin meta

const registry = require('../pluginEngine/pluginRegistry');

async function listPlugins(req, res, next) {
  try {
    const meta = registry.getAllMeta();
    res.json({ ok: true, plugins: meta });
  } catch (err) {
    next(err);
  }
}

module.exports = { listPlugins };
