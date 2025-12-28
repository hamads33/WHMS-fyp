const pricingService = require("../services/service-pricing.service");

class ServicePricingController {
  async create(req, res) {
    res
      .status(201)
      .json(
        await pricingService.create(
          Number(req.params.id),
          req.body,
          req.user
        )
      );
  }
}

module.exports = new ServicePricingController();
