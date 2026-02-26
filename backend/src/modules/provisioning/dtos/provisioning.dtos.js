/**
 * Provisioning DTOs
 * Path: src/modules/provisioning/dtos/provisioning.dtos.js
 */

const Joi = require("joi");

// ============================================================
// DOMAIN DTOs
// ============================================================

const provisionDomainDto = Joi.object({
  domain: Joi.string()
    .domain()
    .required()
    .messages({
      "string.domain": "Invalid domain format",
      "any.required": "Domain is required",
    }),
  ip: Joi.string().ip().optional(), // specific IP or "shared"
  ns1: Joi.string().optional(),
  ns2: Joi.string().optional(),
  ns3: Joi.string().optional(),
  ns4: Joi.string().optional(),
});

// ============================================================
// EMAIL DTOs
// ============================================================

const provisionEmailDto = Joi.object({
  domain: Joi.string().domain().required(),
  account: Joi.string()
    .alphanum()
    .max(64)
    .required()
    .messages({
      "any.required": "Email account name is required",
    }),
  password: Joi.string()
    .min(8)
    .optional()
    .messages({
      "string.min": "Password must be at least 8 characters",
    }),
  quota: Joi.number().integer().min(10).max(10000).optional().default(100),
});

// ============================================================
// DATABASE DTOs
// ============================================================

const provisionDatabaseDto = Joi.object({
  name: Joi.string()
    .alphanum()
    .min(3)
    .max(64)
    .required()
    .messages({
      "any.required": "Database name is required",
    }),
  user: Joi.string()
    .alphanum()
    .min(3)
    .max(16)
    .required()
    .messages({
      "any.required": "Database user is required",
    }),
  password: Joi.string()
    .min(8)
    .optional()
    .messages({
      "string.min": "Password must be at least 8 characters",
    }),
  type: Joi.string()
    .valid("mysql", "pgsql")
    .optional()
    .default("mysql"),
  charset: Joi.string().optional().default("utf8"),
});

module.exports = {
  provisionDomainDto,
  provisionEmailDto,
  provisionDatabaseDto,
};
