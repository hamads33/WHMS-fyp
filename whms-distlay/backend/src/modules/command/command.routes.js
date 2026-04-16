const router = require('express').Router();
const { body, param } = require('express-validator');
const { validate } = require('../../common/middleware/validate.middleware');
const { authenticate, requireAdmin } = require('../../common/middleware/auth.middleware');
const ctrl = require('./command.controller');

router.use(authenticate, requireAdmin);

router.get('/', ctrl.listAllCommands);

router.post('/',
  body('tenant_id').isUUID(),
  body('type').isIn(['suspend', 'resume', 'restart']),
  body('payload').optional().isObject(),
  validate,
  ctrl.createCommand
);

router.get('/tenant/:tenant_id',
  param('tenant_id').isUUID(), validate,
  ctrl.listCommands
);

router.get('/:id',
  param('id').isUUID(), validate,
  ctrl.getCommand
);

module.exports = router;
