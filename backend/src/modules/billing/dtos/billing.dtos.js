/**
 * Billing DTOs
 * Path: src/modules/billing/dtos/billing.dtos.js
 */

const Joi = require("joi");

// ============================================================
// INVOICE DTOs
// ============================================================

const createInvoiceDto = Joi.object({
  clientId: Joi.string().optional(),               // admin-only override
  orderId: Joi.string().optional(),
  currency: Joi.string().length(3).uppercase().optional().default("USD"),
  dueDate: Joi.date().iso().optional(),
  notes: Joi.string().max(1000).optional(),
  status: Joi.string().valid("draft", "unpaid").optional().default("draft"),
  taxRate: Joi.number().min(0).max(1).optional().default(0),
  lineItems: Joi.array()
    .items(
      Joi.object({
        description: Joi.string().required(),
        quantity: Joi.number().integer().min(1).default(1),
        unitPrice: Joi.number().positive().required(),
        serviceCode: Joi.string().optional(),
        planName: Joi.string().optional(),
        cycle: Joi.string().optional(),
      })
    )
    .min(1)
    .required(),
  discounts: Joi.array()
    .items(
      Joi.object({
        type: Joi.string().valid("promo", "credit", "manual").default("manual"),
        code: Joi.string().optional(),
        description: Joi.string().optional(),
        amount: Joi.number().positive().required(),
        isPercent: Joi.boolean().default(false),
      })
    )
    .optional(),
});

const updateInvoiceDto = Joi.object({
  notes: Joi.string().max(1000).optional(),
  dueDate: Joi.date().iso().optional(),
  currency: Joi.string().length(3).uppercase().optional(),
}).min(1);

const generateFromOrderDto = Joi.object({
  dueDays: Joi.number().integer().min(1).max(90).optional().default(7),
  notes: Joi.string().max(1000).optional(),
  force: Joi.boolean().optional().default(false),
});

const applyDiscountDto = Joi.object({
  type: Joi.string().valid("promo", "credit", "manual").default("manual"),
  code: Joi.string().optional(),
  description: Joi.string().max(500).optional(),
  amount: Joi.number().positive().required(),
  isPercent: Joi.boolean().default(false),
});

// ============================================================
// PAYMENT DTOs
// ============================================================

const recordPaymentDto = Joi.object({
  amount: Joi.number().positive().required().messages({
    "number.positive": "Payment amount must be greater than 0",
    "any.required": "Amount is required",
  }),
  currency: Joi.string().length(3).uppercase().optional(),
  gateway: Joi.string()
    .valid("stripe", "paypal", "bank_transfer", "manual")
    .optional()
    .default("manual"),
  gatewayRef: Joi.string().optional(),
  notes: Joi.string().max(500).optional(),
});

const initiateGatewayDto = Joi.object({
  gateway: Joi.string()
    .valid("stripe", "paypal")
    .required()
    .messages({ "any.required": "Gateway is required" }),
  returnUrl: Joi.string().uri().optional(),
  cancelUrl: Joi.string().uri().optional(),
  meta: Joi.object().optional(),
});

const gatewayCallbackDto = Joi.object({
  status: Joi.string()
    .valid("success", "completed", "failed", "cancelled")
    .required(),
  gatewayRef: Joi.string().optional(),
  reason: Joi.string().optional(),
  raw: Joi.object().optional(),
});

// ============================================================
// REFUND DTOs
// ============================================================

const processRefundDto = Joi.object({
  amount: Joi.number().positive().required().messages({
    "any.required": "Refund amount is required",
    "number.positive": "Refund amount must be greater than 0",
  }),
  reason: Joi.string().max(500).optional(),
  notes: Joi.string().max(1000).optional(),
  gatewayRef: Joi.string().optional(),
});

// ============================================================
// BILLING PROFILE DTOs
// ============================================================

const billingProfileDto = Joi.object({
  currency: Joi.string().length(3).uppercase().optional(),
  billingAddress: Joi.string().max(255).optional(),
  city: Joi.string().max(100).optional(),
  country: Joi.string().length(2).uppercase().optional(),
  postalCode: Joi.string().max(20).optional(),
  taxId: Joi.string().max(50).optional(),
  paymentMethodRef: Joi.string().max(255).optional(),
}).min(1);

// ============================================================
// TAX RULE DTOs
// ============================================================

const createTaxRuleDto = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  rate: Joi.number().min(0).max(1).required().messages({
    "any.required": "Tax rate is required (e.g. 0.17 for 17%)",
  }),
  country: Joi.string().length(2).uppercase().optional().allow(null),
  region: Joi.string().max(100).optional().allow(null),
  serviceType: Joi.string().max(100).optional().allow(null),
  active: Joi.boolean().optional().default(true),
});

const updateTaxRuleDto = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  rate: Joi.number().min(0).max(1).optional(),
  country: Joi.string().length(2).uppercase().optional().allow(null),
  region: Joi.string().max(100).optional().allow(null),
  serviceType: Joi.string().max(100).optional().allow(null),
  active: Joi.boolean().optional(),
}).min(1);

module.exports = {
  createInvoiceDto,
  updateInvoiceDto,
  generateFromOrderDto,
  applyDiscountDto,
  recordPaymentDto,
  initiateGatewayDto,
  gatewayCallbackDto,
  processRefundDto,
  billingProfileDto,
  createTaxRuleDto,
  updateTaxRuleDto,
};