const Joi = require("joi");

const SERVER_TYPES = ["mock-cpanel", "mock-vps", "mock-cloud"];
const SERVER_STATUSES = ["active", "offline", "maintenance"];

const capabilitiesSchema = Joi.object({
  ssl:     Joi.boolean(),
  backups: Joi.boolean(),
  docker:  Joi.boolean(),
  nodejs:  Joi.boolean(),
  python:  Joi.boolean(),
  email:   Joi.boolean(),
}).optional();

const createServerSchema = Joi.object({
  name:         Joi.string().min(2).max(100).required(),
  hostname:     Joi.string().hostname().required(),
  ipAddress:    Joi.string().ip().required(),
  type:         Joi.string().valid(...SERVER_TYPES).required(),
  status:       Joi.string().valid(...SERVER_STATUSES).default("active"),
  groupId:      Joi.string().uuid().optional().allow(null),
  tags:         Joi.array().items(Joi.string().max(50)).default([]),
  isDefault:    Joi.boolean().default(false),
  capabilities: capabilitiesSchema,
});

const updateServerSchema = Joi.object({
  name:         Joi.string().min(2).max(100),
  hostname:     Joi.string().hostname(),
  ipAddress:    Joi.string().ip(),
  type:         Joi.string().valid(...SERVER_TYPES),
  status:       Joi.string().valid(...SERVER_STATUSES),
  groupId:      Joi.string().uuid().optional().allow(null),
  tags:         Joi.array().items(Joi.string().max(50)),
  isDefault:    Joi.boolean(),
  capabilities: capabilitiesSchema,
}).min(1);

const createGroupSchema = Joi.object({
  name:        Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).optional().allow(null, ""),
});

const updateGroupSchema = Joi.object({
  name:        Joi.string().min(2).max(100),
  description: Joi.string().max(500).optional().allow(null, ""),
}).min(1);

const createAccountSchema = Joi.object({
  userId:   Joi.string().uuid().required(),
  domain:   Joi.string().domain().required(),
  username: Joi.string().alphanum().min(3).max(32).required(),
  password: Joi.string().min(8).max(64).required(),
  // Optional quota overrides
  diskLimitMB:      Joi.number().integer().min(256).max(1048576).optional(),
  bandwidthLimitMB: Joi.number().integer().min(1024).max(10485760).optional(),
  databaseLimit:    Joi.number().integer().min(1).max(100).optional(),
  emailLimit:       Joi.number().integer().min(1).max(1000).optional(),
});

const updateQuotasSchema = Joi.object({
  diskLimitMB:      Joi.number().integer().min(256).max(1048576),
  bandwidthLimitMB: Joi.number().integer().min(1024).max(10485760),
  databaseLimit:    Joi.number().integer().min(1).max(100),
  emailLimit:       Joi.number().integer().min(1).max(1000),
}).min(1);

const maintenanceSchema = Joi.object({
  enabled: Joi.boolean().required(),
});

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({
        error: "Validation failed",
        details: error.details.map((d) => d.message),
      });
    }
    req.body = value;
    next();
  };
}

module.exports = {
  validateCreateServer:   validate(createServerSchema),
  validateUpdateServer:   validate(updateServerSchema),
  validateCreateGroup:    validate(createGroupSchema),
  validateUpdateGroup:    validate(updateGroupSchema),
  validateCreateAccount:  validate(createAccountSchema),
  validateUpdateQuotas:   validate(updateQuotasSchema),
  validateMaintenance:    validate(maintenanceSchema),
};
