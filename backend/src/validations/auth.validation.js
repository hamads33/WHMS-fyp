// src/validations/auth.validation.js
const Joi = require('joi')

exports.registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'client').optional()
})

exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
})

exports.refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
})
