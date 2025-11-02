const express = require('express');
const router = express.Router();
const controller = require('./provisioning.controller');

router.post('/provision', controller.provisionService);

module.exports = router;
