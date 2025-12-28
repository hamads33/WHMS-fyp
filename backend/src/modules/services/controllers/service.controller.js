const serviceService = require("../services/service.service");

class ServiceController {
  async create(req, res) {
    const result = await serviceService.create(req.body, req.user);
    res.status(201).json(result);
  }

  async list(req, res) {
    res.json(await serviceService.listAll());
  }

  async listActive(req, res) {
    res.json(await serviceService.listActive());
  }

  async get(req, res) {
    res.json(await serviceService.getById(Number(req.params.id)));
  }

  async update(req, res) {
    res.json(
      await serviceService.update(
        Number(req.params.id),
        req.body,
        req.user
      )
    );
  }

  async deactivate(req, res) {
    await serviceService.deactivate(Number(req.params.id), req.user);
    res.status(204).send();
  }
}

module.exports = new ServiceController();
