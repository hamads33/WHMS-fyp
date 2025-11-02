const express = require('express');
const router = express.Router();
const controller = require('./clients.controller');

router.get('/', controller.list);
router.post('/', controller.create);
router.post('/:clientId/reset-password', controller.resetPassword);
router.post('/:clientId/services', controller.addService);
router.delete('/service/:serviceId', controller.removeService);

module.exports = router;
