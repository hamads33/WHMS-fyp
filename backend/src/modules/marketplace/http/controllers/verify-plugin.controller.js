// src/modules/marketplace/http/controllers/verify-plugin.controller.js

module.exports = ({ verifyPlugin }) => {
  return async (req, res, next) => {
    try {
      const versionId = req.params.versionId;

      const result = await verifyPlugin.execute({
        versionId,
        passed: req.body.passed,
        issues: req.body.issues || {}
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
};
