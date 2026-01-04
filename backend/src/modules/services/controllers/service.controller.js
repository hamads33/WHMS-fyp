const serviceService = require("../services/service.service");

class ServiceController {
  async create(req, res) {
    try {
      const result = await serviceService.create(req.body, req.user);
      res.status(201).json(result);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  async list(req, res) {
    try {
      const services = await serviceService.listAll();
      res.json(services);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  async listActive(req, res) {
    try {
      const services = await serviceService.listActive();
      res.json(services);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  async get(req, res) {
    try {
      const service = await serviceService.getById(Number(req.params.id));
      res.json(service);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  async update(req, res) {
    try {
      const service = await serviceService.update(
        Number(req.params.id),
        req.body,
        req.user
      );
      res.json(service);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  async deactivate(req, res) {
    try {
      await serviceService.deactivate(Number(req.params.id), req.user);
      res.status(204).send();
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  /**
   * Get active service by ID (client view)
   */
 async getActive(req, res) {
  try {
    const service = await serviceService.getActiveById(Number(req.params.id));
    // ✅ Now uses getActiveById which filters by active: true
    res.json(service);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}
}

module.exports = new ServiceController();