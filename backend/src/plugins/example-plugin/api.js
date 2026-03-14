/**
 * example-plugin/api.js
 * ------------------------------------------------------------------
 * Minimal Express router for the example plugin.
 * Copy and extend when building a new plugin.
 *
 * @param {object} ctx  - Plugin context
 * @returns {Router}
 */

const { Router } = require("express");

module.exports = function buildRouter(ctx) {
  const router = Router();

  router.get("/ping", (req, res) => {
    res.json({ plugin: "example-plugin", status: "ok" });
  });

  return router;
};
