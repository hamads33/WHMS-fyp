const express = require('express');
const router = express.Router();
const controller = require('../controllers/backup.controller');

// middleware: replace with your auth & RBAC
const ensureAdmin = (req, res, next) => {
  // placeholder
  if (!req.user || !req.user.isAdmin) return res.status(403).json({ success:false, error: 'Forbidden' });
  return next();
};

router.get('/', /*ensureAdmin, */controller.listBackups);
router.get('/:id', controller.getBackup);
router.post('/', controller.runBackup);
router.post('/configs/test',  controller.testStorageConnection);
router.delete('/:id',  controller.deleteBackup);

module.exports = router;
