const express = require('express');
const router = express.Router();
const controller = require('../controllers/domain.controller');
// special GETs first
router.get('/availability/check', controller.checkAvailability);
router.get('/whois', controller.whoisLookup);

// CRUD
router.get('/', controller.getAllDomains);
router.get('/:id', controller.getDomainById);
router.post('/register', controller.registerDomain);
router.post('/:id/dns', controller.addDnsRecord);

// DELETE (must be AFTER CRUD)
router.delete('/:id', controller.deleteDomain);

module.exports = router;
