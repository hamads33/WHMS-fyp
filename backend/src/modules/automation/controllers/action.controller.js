// src/modules/automation/controllers/action.controller.js
// GET /actions — lists available actions (builtin + user)

const registry = require('../pluginEngine/pluginRegistry');

function listActions(req, res) {
  try {
    const actions = registry.listActions();
    res.json(actions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listActions };
