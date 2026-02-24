/**
 * Enhanced Service Module DTOs
 * Path: src/modules/services/dtos/index.js
 * 
 * Validation schemas for all service-related endpoints
 */

const Joi = require("joi");

// ============================================================
// SERVICE GROUP DTOs
// ============================================================

const createServiceGroupDto = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      "string.min": "Group name must be at least 2 characters",
      "any.required": "Group name is required",
    }),
  description: Joi.string()
    .max(500)
    .optional(),
  icon: Joi.string()
    .max(50)
    .optional(),
  position: Joi.number()
    .integer()
    .min(0)
    .optional()
    .default(0),
});

const updateServiceGroupDto = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .optional(),
  description: Joi.string()
    .max(500)
    .optional(),
  icon: Joi.string()
    .max(50)
    .optional(),
  position: Joi.number()
    .integer()
    .min(0)
    .optional(),
  active: Joi.boolean().optional(),
  hidden: Joi.boolean().optional(),
}).min(1);

// ============================================================
// ENHANCED SERVICE DTOs
// ============================================================

const createServiceDto = Joi.object({
  code: Joi.string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .min(3)
    .max(50)
    .required()
    .messages({
      "string.pattern.base": "Service code must be alphanumeric with underscores or hyphens",
      "string.min": "Service code must be at least 3 characters",
      "any.required": "Service code is required",
    }),
  name: Joi.string()
    .min(3)
    .max(255)
    .required()
    .messages({
      "string.min": "Service name must be at least 3 characters",
      "any.required": "Service name is required",
    }),
  description: Joi.string()
    .min(3)
    .max(1000)
    .required(),
  shortDescription: Joi.string()
    .max(255)
    .optional(),
  groupId: Joi.string()
    .uuid()
    .optional(),
  moduleName: Joi.string()
    .optional(),
  moduleType: Joi.string()
    .valid("hosting", "domain", "ssl", "vps", "dedicated", "custom")
    .optional(),
  customizeOption: Joi.string()
    .valid("none", "addon_only", "full")
    .optional()
    .default("none"),
  paymentType: Joi.string()
    .valid("regular", "onetime", "free")
    .optional()
    .default("regular"),
  requiresDomain: Joi.boolean().optional(),
  allowAutoRenew: Joi.boolean().optional(),
  autoSetup: Joi.boolean().optional(),
  autoSuspend: Joi.boolean().optional(),
  taxable: Joi.boolean().optional(),
});

const updateServiceDto = Joi.object({
  name: Joi.string().min(3).max(255).optional(),
  description: Joi.string().min(10).max(1000).optional(),
  shortDescription: Joi.string().max(255).optional().allow(""),
  tagline: Joi.string().max(255).optional().allow(""),
  groupId: Joi.string().uuid().optional().allow(null),
  moduleName: Joi.string().optional().allow(""),
  moduleType: Joi.string().valid("hosting", "domain", "ssl", "vps", "dedicated", "custom").optional().allow(""),
  serverGroup: Joi.string().optional().allow(""),
  welcomeEmailTemplate: Joi.string().optional().allow(""),
  color: Joi.string().max(20).optional().allow(""),
  active: Joi.boolean().optional(),
  hidden: Joi.boolean().optional(),
  featured: Joi.boolean().optional(),
  retired: Joi.boolean().optional(),
  customizeOption: Joi.string().valid("none", "addon_only", "full").optional(),
  paymentType: Joi.string().valid("regular", "onetime", "free").optional(),
  taxable: Joi.boolean().optional(),
  requiresDomain: Joi.boolean().optional(),
  allowAutoRenew: Joi.boolean().optional(),
  autoSetup: Joi.boolean().optional(),
  autoSuspend: Joi.boolean().optional(),
  onDemandRenewals: Joi.boolean().optional(),
  prorataBilling: Joi.boolean().optional(),
  prorataDate: Joi.number().integer().min(0).max(28).optional(),
  chargeNextMonth: Joi.number().integer().min(0).max(28).optional(),
  recurringCyclesLimit: Joi.number().integer().min(0).optional(),
  autoTerminateDays: Joi.number().integer().min(0).optional(),
  multipleQuantities: Joi.string().valid("no", "multiple", "scaling").optional(),
  billingCycles: Joi.string().optional(),
  position: Joi.number().integer().min(0).optional(),
}).min(1);

// ============================================================
// SERVICE ADDON DTOs
// ============================================================

const createAddonDto = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required(),
  description: Joi.string()
    .max(500)
    .optional(),
  code: Joi.string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .min(2)
    .max(50)
    .required(),
  setupFee: Joi.number()
    .precision(2)
    .min(0)
    .optional()
    .default(0),
  monthlyPrice: Joi.number()
    .positive()
    .precision(2)
    .required(),
  currency: Joi.string()
    .length(3)
    .uppercase()
    .optional()
    .default("USD"),
  maxQuantity: Joi.number()
    .integer()
    .min(1)
    .optional(),
  required: Joi.boolean().optional(),
  recurring: Joi.boolean().optional(),
  billingType: Joi.string()
    .valid("shared", "separate")
    .optional()
    .default("shared"),
  position: Joi.number()
    .integer()
    .min(0)
    .optional(),
});

const updateAddonDto = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .optional(),
  description: Joi.string()
    .max(500)
    .optional(),
  setupFee: Joi.number()
    .precision(2)
    .min(0)
    .optional(),
  monthlyPrice: Joi.number()
    .positive()
    .precision(2)
    .optional(),
  currency: Joi.string()
    .length(3)
    .uppercase()
    .optional(),
  maxQuantity: Joi.number()
    .integer()
    .min(1)
    .optional()
    .allow(null),
  required: Joi.boolean().optional(),
  active: Joi.boolean().optional(),
  position: Joi.number()
    .integer()
    .min(0)
    .optional(),
}).min(1);

// ============================================================
// SERVICE FEATURE DTOs
// ============================================================

const createFeatureDto = Joi.object({
  key: Joi.string()
    .regex(/^[a-z0-9_]+$/)
    .min(2)
    .max(50)
    .required(),
  name: Joi.string()
    .min(2)
    .max(100)
    .required(),
  description: Joi.string()
    .max(500)
    .optional(),
  type: Joi.string()
    .valid("text", "number", "boolean", "select", "resource")
    .optional()
    .default("text"),
  unit: Joi.string()
    .max(20)
    .optional(),
  icon: Joi.string()
    .max(50)
    .optional(),
  category: Joi.string()
    .max(50)
    .optional(),
  position: Joi.number()
    .integer()
    .min(0)
    .optional(),
});

const updateFeatureDto = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .optional(),
  description: Joi.string()
    .max(500)
    .optional(),
  unit: Joi.string()
    .max(20)
    .optional(),
  icon: Joi.string()
    .max(50)
    .optional(),
  category: Joi.string()
    .max(50)
    .optional(),
  active: Joi.boolean().optional(),
  position: Joi.number()
    .integer()
    .min(0)
    .optional(),
}).min(1);

// ============================================================
// ENHANCED PLAN DTOs
// ============================================================

const createPlanDto = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required(),
  summary: Joi.string()
    .max(500)
    .optional(),
  description: Joi.string()
    .max(1000)
    .optional(),
  paymentType: Joi.string()
    .valid("regular", "onetime")
    .optional()
    .default("regular"),
  minimumBillingCycles: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1),
  maximumBillingCycles: Joi.number()
    .integer()
    .min(1)
    .optional(),
  customizeOption: Joi.string()
    .valid("none", "addon_only", "full")
    .optional()
    .default("none"),
  maxQuantity: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1),
  stockLimit: Joi.number()
    .integer()
    .min(1)
    .optional(),
  position: Joi.number()
    .integer()
    .min(0)
    .optional()
    .default(0),
});

const updatePlanDto = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .optional(),
  summary: Joi.string()
    .max(500)
    .optional(),
  description: Joi.string()
    .max(1000)
    .optional(),
  customizeOption: Joi.string()
    .valid("none", "addon_only", "full")
    .optional(),
  maxQuantity: Joi.number()
    .integer()
    .min(1)
    .optional(),
  stockLimit: Joi.number()
    .integer()
    .min(1)
    .optional()
    .allow(null),
  active: Joi.boolean().optional(),
  hidden: Joi.boolean().optional(),
  position: Joi.number()
    .integer()
    .min(0)
    .optional(),
}).min(1);

// ============================================================
// ENHANCED PRICING DTOs
// ============================================================

const createPricingDto = Joi.object({
  cycle: Joi.string()
    .valid(
      "monthly",
      "quarterly",
      "semi_annually",
      "annually",
      "biennially",
      "triennially"
    )
    .required(),
  setupFee: Joi.number()
    .precision(2)
    .min(0)
    .optional()
    .default(0),
  price: Joi.number()
    .positive()
    .precision(2)
    .required(),
  renewalPrice: Joi.number()
    .precision(2)
    .optional(),
  suspensionFee: Joi.number()
    .precision(2)
    .min(0)
    .optional()
    .default(0),
  terminationFee: Joi.number()
    .precision(2)
    .min(0)
    .optional()
    .default(0),
  currency: Joi.string()
    .length(3)
    .uppercase()
    .optional()
    .default("USD"),
  discountType: Joi.string()
    .valid("percentage", "fixed")
    .optional(),
  discountAmount: Joi.number()
    .precision(2)
    .min(0)
    .optional(),
  discountValidUntil: Joi.date().optional(),
  taxable: Joi.boolean().optional(),
});

const updatePricingDto = Joi.object({
  setupFee: Joi.number()
    .precision(2)
    .min(0)
    .optional(),
  price: Joi.number()
    .positive()
    .precision(2)
    .optional(),
  renewalPrice: Joi.number()
    .precision(2)
    .optional()
    .allow(null),
  suspensionFee: Joi.number()
    .precision(2)
    .min(0)
    .optional(),
  currency: Joi.string()
    .length(3)
    .uppercase()
    .optional(),
  discountType: Joi.string()
    .valid("percentage", "fixed")
    .optional()
    .allow(null),
  discountAmount: Joi.number()
    .precision(2)
    .min(0)
    .optional(),
  active: Joi.boolean().optional(),
}).min(1);

// ============================================================
// SERVICE AUTOMATION DTOs
// ============================================================

const createAutomationDto = Joi.object({
  event: Joi.string()
    .valid(
      "create",
      "suspend",
      "resume",
      "terminate",
      "upgrade",
      "downgrade",
      "renew",
      "payment_received",
      "payment_overdue"
    )
    .required(),
  action: Joi.string()
    .valid(
      "provision",
      "suspend",
      "terminate",
      "email",
      "webhook",
      "credit_account",
      "debit_account"
    )
    .required(),
  module: Joi.string()
    .optional(),
  provisioningKey: Joi.string()
    .optional(),
  webhookUrl: Joi.string()
    .uri()
    .optional(),
  emailTemplate: Joi.string()
    .optional(),
  config: Joi.object()
    .optional(),
  priority: Joi.number()
    .integer()
    .optional()
    .default(0),
});

const updateAutomationDto = Joi.object({
  action: Joi.string()
    .valid(
      "provision",
      "suspend",
      "terminate",
      "email",
      "webhook",
      "credit_account",
      "debit_account"
    )
    .optional(),
  module: Joi.string()
    .optional(),
  provisioningKey: Joi.string()
    .optional(),
  webhookUrl: Joi.string()
    .uri()
    .optional(),
  emailTemplate: Joi.string()
    .optional(),
  config: Joi.object()
    .optional(),
  enabled: Joi.boolean().optional(),
  priority: Joi.number()
    .integer()
    .optional(),
}).min(1);

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // Service Groups
  createServiceGroupDto,
  updateServiceGroupDto,

  // Services
  createServiceDto,
  updateServiceDto,

  // Add-ons
  createAddonDto,
  updateAddonDto,

  // Features
  createFeatureDto,
  updateFeatureDto,

  // Plans
  createPlanDto,
  updatePlanDto,

  // Pricing
  createPricingDto,
  updatePricingDto,

  // Automation
  createAutomationDto,
  updateAutomationDto,
};