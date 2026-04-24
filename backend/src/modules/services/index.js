/**
 * Services Module
 * Provides hosting services, plans, and pricing management
 */

// Routes
const adminRoutes = require("./routes/admin.services.routes");
const clientRoutes = require("./routes/client.services.routes");

// Controllers
const serviceController = require("./controllers/service.controller");
const planController = require("./controllers/service-plan.controller");
const pricingController = require("./controllers/service-pricing.controller");

// Services
const serviceService = require("./services/service.service");
const planService = require("./services/service-plan.service");
const pricingService = require("./services/service-pricing.service");
const snapshotService = require("./services/service-snapshot.service");
const policyService = require("./policies/service-policy.service");

// DTOs
const {
  createServiceDto,
  updateServiceDto,
  createPlanDto,
  updatePlanDto,
  createPricingDto,
  updatePricingDto,
} = require("./dtos");

// Middleware
const validate = require("./middleware/validation.middleware");

module.exports = {
  // Routes
  adminRoutes,
  clientRoutes,

  // Controllers
  controllers: {
    serviceController,
    planController,
    pricingController,
  },

  // Services
  services: {
    serviceService,
    planService,
    pricingService,
    snapshotService,
    policyService,
  },

  // DTOs
  dtos: {
    createServiceDto,
    updateServiceDto,
    createPlanDto,
    updatePlanDto,
    createPricingDto,
    updatePricingDto,
  },

  // Middleware
  middleware: {
    validate,
  },
};