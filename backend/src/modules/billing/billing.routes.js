const express = require('express');
const router = express.Router();
const controller = require('./billing.controller');

router.get('/invoices', controller.listInvoices);
router.post('/invoice', controller.createInvoice);

module.exports = router;
