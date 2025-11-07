// src/routes/auth.routes.js
const express = require('express')
const router = express.Router()
const authController = require('./auth.controller')
const validate = require('../../middleware/validate.middleware')
const { registerSchema, loginSchema, refreshSchema } = require('../../validation/auth.validation')
const authMiddleware = require('../../middleware/auth.middleware')

router.post('/signup', validate(registerSchema), authController.register)
router.post('/signin', validate(loginSchema), authController.login)
router.post('/refresh', validate(refreshSchema), authController.refresh)
router.post('/signout', authMiddleware, authController.signout) // user can sign out (revoke all) or send refresh token in body
// alternate: /signout-with-token that accepts refreshToken and does not require auth
router.post('/signout-with-token', authController.signoutWithToken)

module.exports = router
