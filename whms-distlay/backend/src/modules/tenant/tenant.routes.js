const router = require('express').Router();
const { body, param } = require('express-validator');
const { validate } = require('../../common/middleware/validate.middleware');
const { authenticate, requireAdmin } = require('../../common/middleware/auth.middleware');
const ctrl = require('./tenant.controller');

router.get('/me', authenticate, ctrl.getMyTenant);

router.get('/', authenticate, requireAdmin, ctrl.listTenants);

router.get('/:id',
  authenticate, requireAdmin,
  param('id').isUUID(), validate,
  ctrl.getTenantById
);

router.patch('/:id/status',
  authenticate, requireAdmin,
  param('id').isUUID(),
  body('status').isIn(['pending', 'active', 'suspended']),
  validate,
  ctrl.updateTenantStatus
);

module.exports = router;
