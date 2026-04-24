const express = require('express');
const controller = require('../controllers/broadcast.controller');

const router = express.Router();

// Routes
router.get('/notifications', controller.getNotifications);
router.get('/documents', controller.getDocuments);
router.post('/:id/dismiss', controller.dismissNotification);
router.get('/:id/download', controller.downloadDocument);

module.exports = router;
