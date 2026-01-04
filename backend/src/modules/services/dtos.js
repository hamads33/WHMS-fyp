// ============================================================================
// CREATE SERVICE DTO
// ============================================================================

const createServiceDto = require("joi").object({
  code: require("joi")
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)  // FIX: Allow alphanumeric, underscore, hyphen
    .min(3)
    .max(50)
    .required()
    .messages({
      "string.pattern.base": "Service code must be alphanumeric with underscores or hyphens",
      "string.min": "Service code must be at least 3 characters",
      "any.required": "Service code is required",
    }),
  name: require("joi")
    .string()
    .min(3)
    .max(255)
    .required()
    .messages({
      "string.min": "Service name must be at least 3 characters",
      "any.required": "Service name is required",
    }),
  description: require("joi")
    .string()
    .min(10)
    .max(1000)
    .required()
    .messages({
      "string.min": "Description must be at least 10 characters",
      "any.required": "Description is required",
    }),
});

// ============================================================================
// UPDATE SERVICE DTO
// ============================================================================

const updateServiceDto = require("joi").object({
  name: require("joi")
    .string()
    .min(3)
    .max(255)
    .optional(),
  description: require("joi")
    .string()
    .min(10)
    .max(1000)
    .optional(),
  active: require("joi")
    .boolean()
    .optional(),
}).min(1);

// ============================================================================
// CREATE PLAN DTO
// ============================================================================

const createPlanDto = require("joi").object({
  name: require("joi")
    .string()
    .min(2)
    .max(100)
    .required()
    .messages({
      "string.min": "Plan name must be at least 2 characters",
      "any.required": "Plan name is required",
    }),
  description: require("joi")
    .string()
    .max(500)
    .optional(),
  position: require("joi")
    .number()
    .integer()
    .min(0)
    .optional()
    .default(0),
});

// ============================================================================
// UPDATE PLAN DTO
// ============================================================================

const updatePlanDto = require("joi").object({
  name: require("joi")
    .string()
    .min(2)
    .max(100)
    .optional(),
  description: require("joi")
    .string()
    .max(500)
    .optional(),
  position: require("joi")
    .number()
    .integer()
    .min(0)
    .optional(),
}).min(1);

// ============================================================================
// CREATE PRICING DTO
// ============================================================================

const createPricingDto = require("joi").object({
  cycle: require("joi")
    .string()
    .valid("monthly", "quarterly", "semi_annually", "annually")
    .required()
    .messages({
      "any.only": "Billing cycle must be one of: monthly, quarterly, semi_annually, annually",
      "any.required": "Billing cycle is required",
    }),
  price: require("joi")
    .number()
    .positive()
    .precision(2)
    .required()
    .messages({
      "number.positive": "Price must be greater than 0",
      "any.required": "Price is required",
    }),
  currency: require("joi")
    .string()
    .length(3)
    .uppercase()
    .optional()
    .default("USD"),
});

// ============================================================================
// UPDATE PRICING DTO
// ============================================================================

const updatePricingDto = require("joi").object({
  price: require("joi")
    .number()
    .positive()
    .precision(2)
    .optional(),
  currency: require("joi")
    .string()
    .length(3)
    .uppercase()
    .optional(),
  active: require("joi")
    .boolean()
    .optional(),
}).min(1);

module.exports = {
  createServiceDto,
  updateServiceDto,
  createPlanDto,
  updatePlanDto,
  createPricingDto,
  updatePricingDto,
};