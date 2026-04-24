// src/modules/email/controllers/send.controller.js
const { enqueueEmail, getJobStatus } = require('../email.service');

exports.send = async (req, res) => {
  try {
    const { template, to, to_name: toName, payload, priority, scheduled_at: scheduledAt } = req.body || {};
    if (!template || typeof template !== 'string') {
      return res.status(400).json({ success: false, error: 'template is required' });
    }
    if (!to || typeof to !== 'string') {
      return res.status(400).json({ success: false, error: 'to (recipient email) is required' });
    }
    const jobId = await enqueueEmail({
      templateName: template,
      to,
      toName,
      payload: payload || {},
      priority: priority || 'normal',
      scheduledAt: scheduledAt || null,
    });
    return res.status(202).json({ success: true, jobId, status: 'queued' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getJob = async (req, res) => {
  try {
    const job = await getJobStatus(req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    return res.json({ success: true, job });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
