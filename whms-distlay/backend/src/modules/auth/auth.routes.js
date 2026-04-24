const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../../common/middleware/validate.middleware');
const { authenticate } = require('../../common/middleware/auth.middleware');
const { authRateLimiter } = require('../../common/middleware/rateLimit.middleware');
const ctrl = require('./auth.controller');

const registerRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

router.post('/register', authRateLimiter, registerRules, validate, ctrl.register);
router.post('/login',    authRateLimiter, loginRules,    validate, ctrl.login);
router.get('/me',        authenticate,                             ctrl.me);

module.exports = router;
