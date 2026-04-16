const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../../common/middleware/validate.middleware');
const { authenticate } = require('../../common/middleware/auth.middleware');
const ctrl = require('./installer.controller');

router.post('/token/generate', authenticate, ctrl.generateToken);

router.post('/token/validate',
  body('token').isString().isLength({ min: 32 }),
  validate,
  ctrl.validateToken
);

module.exports = router;
