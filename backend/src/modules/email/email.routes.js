const express = require('express');
const router = express.Router();
const emailController = require('./email.controller');

router.post('/send', emailController.sendEmail);
router.get('/job/:id', emailController.getJob);
router.get('/test', emailController.testEmail);

module.exports = router;
