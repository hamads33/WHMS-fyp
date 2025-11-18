const registry = require('../utils/actionRegistry');

function listActions(req, res) {
  res.json(registry.listActions());
}

module.exports = { listActions };
