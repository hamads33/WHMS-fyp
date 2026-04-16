const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../../common/middleware/validate.middleware');
const { authenticateAgent } = require('../../common/middleware/agent.middleware');
const ctrl = require('./agent.controller');

router.use(authenticateAgent);

router.post('/heartbeat',
  body('status').optional().isIn(['online', 'offline', 'degraded']),
  body('uptime').optional().isInt({ min: 0 }),
  validate,
  ctrl.heartbeat
);

router.get('/commands', ctrl.getCommands);

router.post('/result',
  body('command_id').isUUID(),
  body('success').isBoolean(),
  body('output').optional().isString(),
  validate,
  ctrl.submitResult
);

module.exports = router;
