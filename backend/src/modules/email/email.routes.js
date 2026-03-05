// src/modules/email/email.routes.js
const express = require('express');
const router = express.Router();

const sendCtrl     = require('./controllers/send.controller');
const templateCtrl = require('./controllers/template.controller');
const logCtrl      = require('./controllers/log.controller');
const settingsCtrl = require('./controllers/settings.controller');

// ─────────────────────────────────────────────────────────────
// SEND API  —  POST /api/v1/email/send
// ─────────────────────────────────────────────────────────────
router.post('/send',      sendCtrl.send);
router.get('/job/:id',    sendCtrl.getJob);

// ─────────────────────────────────────────────────────────────
// TEMPLATE MANAGEMENT  —  /api/v1/email/templates
// ─────────────────────────────────────────────────────────────
router.get('/templates/categories',          templateCtrl.categories);
router.get('/templates',                     templateCtrl.list);
router.post('/templates',                    templateCtrl.create);
router.get('/templates/:id',                 templateCtrl.get);
router.put('/templates/:id',                 templateCtrl.update);
router.delete('/templates/:id',              templateCtrl.remove);
router.post('/templates/:id/duplicate',      templateCtrl.duplicate);
router.post('/templates/:id/preview',        templateCtrl.preview);

// ─────────────────────────────────────────────────────────────
// LOGS  —  /api/v1/email/logs
// ─────────────────────────────────────────────────────────────
router.get('/logs',                          logCtrl.list);
router.get('/logs/stats',                    logCtrl.stats);
router.get('/logs/:id',                      logCtrl.get);
router.post('/logs/:id/resend',              logCtrl.resend);

// ─────────────────────────────────────────────────────────────
// DIRECT SEND  —  bypasses queue, instant feedback for testing
// POST /admin/email/send-direct  { to, subject, html, fromName? }
// ─────────────────────────────────────────────────────────────
router.post('/send-direct', async (req, res) => {
  try {
    const { to, subject, html, fromName } = req.body || {};
    if (!to || !subject || !html) {
      return res.status(400).json({ success: false, error: 'to, subject and html are required' });
    }
    const { sendMail } = require('./emailProvider');
    const result = await sendMail({ to, toName: fromName, subject, html, text: '' });
    return res.json({ success: true, message: `Email sent to ${to}`, result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// SETTINGS  —  /api/v1/email/settings
// ─────────────────────────────────────────────────────────────
router.get('/settings',                      settingsCtrl.getAll);
router.put('/settings',                      settingsCtrl.update);
router.get('/settings/branding',             settingsCtrl.getBranding);
router.post('/settings/test-connection',     settingsCtrl.testConnection);
router.post('/settings/test-send',           settingsCtrl.sendTestEmail);

module.exports = router;
