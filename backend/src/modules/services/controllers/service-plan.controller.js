const planService = require("../services/service-plan.service");

class ServicePlanController {
  async create(req, res) {
    const serviceId = Number(req.params.id);
    res
      .status(201)
      .json(await planService.create(serviceId, req.body, req.user));
  }

  async update(req, res) {
    res.json(
      await planService.update(Number(req.params.id), req.body, req.user)
    );
  }
}

module.exports = new ServicePlanController();
