/**
 * Billing Module DTOs
 * Path: src/modules/billing/dtos/index.js
 */

const Joi = require("joi");

const VALID_CYCLES = [
  "monthly",
  "quarterly",
  "semi_annually",
  "annually",
  "biennially",
  "triennially",
];

const VALID_INVOICE_STATUSES = [
  "draft",
  "unpaid",
  "paid",
  "overdue",
  "cancelled",
  "refunded",
];

const VALID_GATEWAYS = ["stripe", "paypal", "manual"];

// ============================================================
// BILLING PROFILE
// ============================================================

const upsertBillingProfileDto = Joi.object({
  currency: Joi.string().length(3).uppercase().optional().default("USD"),
  billingAddress: Joi.string().max(255).optional().allow(null, ""),
  city: Joi.string().max(100).optional().allow(null, ""),
  country: Joi.string().length(2).uppercase().optional().allow(null, ""),
  postalCode: Joi.string().max(20).optional().allow(null, ""),
  taxId: Joi.string().max(50).optional().allow(null, ""),
  paymentMethodRef: Joi.string().max(255).optional().allow(null, ""),
}).min(1);

// ============================================================
// INVOICE GENERATION
// ============================================================

const generateOrderInvoiceDto = Joi.object({
  billingCycles: Joi.number().integer().min(1).optional().default(1),
  dueDays: Joi.number().integer().min(0).max(90).optional().default(7),
  status: Joi.string().valid("draft", "unpaid").optional().default("unpaid"),
});

const generateRenewalInvoiceDto = Joi.object({
  dueDays: Joi.number().integer().min(0).max(30).optional().default(3),
  status: Joi.string().valid("draft", "unpaid").optional().default("unpaid"),
});

const generateFeeInvoiceDto = Joi.object({
  reason: Joi.string().max(500).optional().allow(null, ""),
});

// ============================================================
// MANUAL INVOICE
// ============================================================

const lineItemDto = Joi.object({
  description: Joi.string().min(1).max(500).required(),
  quantity: Joi.number().integer().min(1).optional().default(1),
  unitPrice: Joi.number().positive().precision(2).required(),
  taxRate: Joi.number().min(0).max(1).precision(4).optional().allow(null),
  serviceCode: Joi.string().max(50).optional().allow(null, ""),
  planName: Joi.string().max(100).optional().allow(null, ""),
  cycle: Joi.string().valid(...VALID_CYCLES).optional().allow(null),
});

const discountDto = Joi.object({
  type: Joi.string().valid("promo", "credit", "manual").required(),
  code: Joi.string().max(50).optional().allow(null, ""),
  description: Joi.string().max(255).optional().allow(null, ""),
  amount: Joi.number().min(0).precision(2).required(),
  isPercent: Joi.boolean().optional().default(false),
});

const createManualInvoiceDto = Joi.object({
  clientId: Joi.string().uuid().required(),
  currency: Joi.string().length(3).uppercase().optional().default("USD"),
  lineItems: Joi.array().items(lineItemDto).min(1).required(),
  discounts: Joi.array().items(discountDto).optional().default([]),
  dueDays: Joi.number().integer().min(0).max(90).optional().default(7),
  notes: Joi.string().max(1000).optional().allow(null, ""),
  status: Joi.string().valid("draft", "unpaid").optional().default("draft"),
});

// ============================================================
// DISCOUNT APPLICATION
// ============================================================

const applyDiscountDto = Joi.object({
  type: Joi.string().valid("promo", "credit", "manual").required(),
  code: Joi.string().max(50).optional().allow(null, ""),
  description: Joi.string().max(255).optional().allow(null, ""),
  amount: Joi.number().min(0).precision(2).required(),
  isPercent: Joi.boolean().optional().default(false),
});

// ============================================================
// PAYMENTS
// ============================================================

const recordPaymentDto = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  currency: Joi.string().length(3).uppercase().optional(),
  gateway: Joi.string().valid(...VALID_GATEWAYS).optional().default("manual"),
  gatewayRef: Joi.string().max(255).optional().allow(null, ""),
  gatewayStatus: Joi.string().max(50).optional().allow(null, ""),
  notes: Joi.string().max(500).optional().allow(null, ""),
});

const initiatePaymentDto = Joi.object({
  gateway: Joi.string().valid("stripe", "paypal", "manual").required(),
  returnUrl: Joi.string().uri().optional(),
  cancelUrl: Joi.string().uri().optional(),
});

// ============================================================
// REFUNDS
// ============================================================

const processRefundDto = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  reason: Joi.string().max(500).optional().allow(null, ""),
  notes: Joi.string().max(1000).optional().allow(null, ""),
});

// ============================================================
// TAX RULES
// ============================================================

const createTaxRuleDto = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  rate: Joi.number().min(0).max(1).precision(4).required().messages({
    "number.min": "Tax rate must be >= 0",
    "number.max": "Tax rate must be <= 1 (use 0.17 for 17%)",
    "any.required": "Tax rate is required",
  }),
  country: Joi.string().length(2).uppercase().optional().allow(null),
  region: Joi.string().max(50).optional().allow(null),
  serviceType: Joi.string().valid("hosting", "domain", "ssl", "custom").optional().allow(null),
});

const updateTaxRuleDto = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  rate: Joi.number().min(0).max(1).precision(4).optional(),
  country: Joi.string().length(2).uppercase().optional().allow(null),
  region: Joi.string().max(50).optional().allow(null),
  serviceType: Joi.string().valid("hosting", "domain", "ssl", "custom").optional().allow(null),
  active: Joi.boolean().optional(),
}).min(1);

const taxPreviewDto = Joi.object({
  clientId: Joi.string().uuid().required(),
  subtotal: Joi.number().positive().precision(2).required(),
  serviceType: Joi.string().valid("hosting", "domain", "ssl", "custom").optional().allow(null),
});

// ============================================================
// BATCH OPERATIONS
// ============================================================

const processDueRenewalsDto = Joi.object({
  daysAhead: Joi.number().integer().min(1).max(30).optional().default(3),
});

const processOverdueDto = Joi.object({
  autoSuspend: Joi.boolean().optional().default(false),
});

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // Profile
  upsertBillingProfileDto,

  // Invoice generation
  generateOrderInvoiceDto,
  generateRenewalInvoiceDto,
  generateFeeInvoiceDto,
  createManualInvoiceDto,
  applyDiscountDto,

  // Payments
  recordPaymentDto,
  initiatePaymentDto,
  processRefundDto,

  // Tax
  createTaxRuleDto,
  updateTaxRuleDto,
  taxPreviewDto,

  // Batch
  processDueRenewalsDto,
  processOverdueDto,
};