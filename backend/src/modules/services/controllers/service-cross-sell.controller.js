const crossSellService = require("../services/service-cross-sell.service");

class ServiceCrossSellController {
  async add(req, res) {
    try {
      const item = await crossSellService.add(req.params.id, req.body.crossSellServiceId);
      res.status(201).json(item);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async list(req, res) {
    try {
      const items = await crossSellService.listByService(req.params.id);
      res.json({ crossSells: items });
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async remove(req, res) {
    try {
      await crossSellService.remove(req.params.id, req.params.crossSellServiceId);
      res.status(204).send();
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
}

module.exports = new ServiceCrossSellController();
