const router = require('express').Router();
const { body, param } = require('express-validator');
const { validate } = require('../../common/middleware/validate.middleware');
const { authenticate, requireAdmin } = require('../../common/middleware/auth.middleware');
const ctrl = require('./billing.controller');

// ── Public ────────────────────────────────────────────────────────────────────

router.get('/plans',      ctrl.getPlans);
router.get('/plans/:id',  param('id').isUUID(), validate, ctrl.getPlanById);

// ── Authenticated user ────────────────────────────────────────────────────────

router.get('/subscription', authenticate, ctrl.getMySubscription);

router.post('/subscribe',
  authenticate,
  body('plan_id').isUUID(),
  validate,
  ctrl.subscribe
);

// ── Admin ─────────────────────────────────────────────────────────────────────

const planCreateRules = [
  body('name').isString().trim().notEmpty(),
  body('price').isFloat({ min: 0 }),
  body('description').optional().isString(),
  body('billing_cycle').optional().isIn(['monthly', 'yearly', 'one_time', 'custom']),
  body('trial_days').optional().isInt({ min: 0 }),
  body('sort_order').optional().isInt({ min: 0 }),
  body('features').optional().isObject(),
  body('metadata').optional().isObject(),
];

const planUpdateRules = [
  param('id').isUUID(),
  body('name').optional().isString().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
  body('description').optional().isString(),
  body('billing_cycle').optional().isIn(['monthly', 'yearly', 'one_time', 'custom']),
  body('trial_days').optional().isInt({ min: 0 }),
  body('sort_order').optional().isInt({ min: 0 }),
  body('is_active').optional().isBoolean(),
  body('features').optional().isObject(),
  body('metadata').optional().isObject(),
];

router.get('/admin/plans',
  authenticate, requireAdmin,
  ctrl.adminListPlans
);

router.post('/admin/plans',
  authenticate, requireAdmin,
  planCreateRules, validate,
  ctrl.createPlan
);

router.patch('/admin/plans/:id',
  authenticate, requireAdmin,
  planUpdateRules, validate,
  ctrl.updatePlan
);

router.delete('/admin/plans/:id',
  authenticate, requireAdmin,
  param('id').isUUID(), validate,
  ctrl.deletePlan
);

module.exports = router;
