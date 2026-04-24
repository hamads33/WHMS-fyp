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
      const service = await serviceService.getById(req.params.id);
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
        req.params.id,
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
      await serviceService.deactivate(req.params.id, req.user);
      res.status(204).send();
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
      });
    }
  }

  async getActive(req, res) {
    try {
      const service = await serviceService.getActiveById(req.params.id);
      res.json(service);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async toggleVisibility(req, res) {
    try {
      const service = await serviceService.toggleVisibility(req.params.id, req.user);
      res.json(service);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async getComparison(req, res) {
    try {
      const data = await serviceService.getComparison(req.params.id);
      res.json(data);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async getStats(req, res) {
    try {
      const data = await serviceService.getStats(req.params.id);
      res.json(data);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async bulkUpdate(req, res) {
    try {
      const { ids, data } = req.body;
      const result = await serviceService.bulkUpdate(ids, data, req.user);
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async bulkDelete(req, res) {
    try {
      const { ids } = req.body;
      const result = await serviceService.bulkDelete(ids, req.user);
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async hardDelete(req, res) {
    try {
      await serviceService.hardDelete(req.params.id, req.user);
      res.status(204).send();
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async bulkHardDelete(req, res) {
    try {
      const { ids } = req.body;
      const result = await serviceService.bulkHardDelete(ids, req.user);
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async import(req, res) {
    try {
      const results = await serviceService.importServices(req.body, req.user);
      res.json(results);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async export(req, res) {
    try {
      const data = await serviceService.exportServices();
      res.json(data);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
}

module.exports = new ServiceController();