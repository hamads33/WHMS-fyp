const Joi = require("joi");

module.exports = Joi.object({
  code: Joi.string().alphanum().min(3).required(),
  name: Joi.string().min(3).required(),
  description: Joi.string().required(),
});
