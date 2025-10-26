// src/routes/email.routes.js
const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');

// Test endpoint - quick smoke test that queues a predefined email
router.get('/test', emailController.testEmail);

// Generic send endpoint - sends/queues email based on body
// Body: { "template": "invoice.created", "to": "a@b.com", "to_name": "Name", "payload": {...}, "priority":"high" }
router.post('/send', emailController.sendEmail);

module.exports = router;
