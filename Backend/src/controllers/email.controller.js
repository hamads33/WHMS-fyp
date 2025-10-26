// src/controllers/emailController.js
const express = require('express');
const router = express.Router();
const { enqueueEmail, getJobStatus } = require('../services/emailService');

// POST /api/v1/email/send
router.post('/send', async (req, res) => {
  try {
    const { template, to, to_name, payload, priority } = req.body;
    if (!template || !to) return res.status(400).json({ error: 'template and to are required' });

    const jobId = await enqueueEmail({
      templateName: template,
      to,
      toName: to_name,
      payload,
      priority: priority || 'normal',
    });

    return res.status(202).json({ jobId, status: 'queued' });
  } catch (err) {
    console.error('email send error', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/email/job/:id
router.get('/job/:id', async (req, res) => {
  const id = req.params.id;
  const job = await getJobStatus(id);
  if (!job) return res.status(404).json({ error: 'job not found' });
  res.json(job);
});

module.exports = router;
