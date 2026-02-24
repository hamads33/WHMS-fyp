const upgradePathService = require("../services/service-upgrade-path.service");

class ServiceUpgradePathController {
  async create(req, res) {
    try {
      const path = await upgradePathService.create(req.params.id, req.body);
      res.status(201).json(path);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async list(req, res) {
    try {
      const paths = await upgradePathService.listByService(req.params.id);
      res.json({ upgradePaths: paths });
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async update(req, res) {
    try {
      const path = await upgradePathService.update(req.params.pathId, req.body);
      res.json(path);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async delete(req, res) {
    try {
      await upgradePathService.delete(req.params.pathId);
      res.status(204).send();
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
}

module.exports = new ServiceUpgradePathController();
