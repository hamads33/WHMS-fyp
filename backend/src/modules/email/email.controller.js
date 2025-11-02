// src/controllers/emailController.js
const { enqueueEmail, getJobStatus } = require('./email.service');

// Helper: simple input validator
function isString(s) {
  return typeof s === 'string' && s.trim().length > 0;
}

/**
 * Controller: send email
 * POST /api/v1/email/send
 * Body: { template, to, to_name, payload, priority }
 */
exports.sendEmail = async (req, res) => {
  try {
    const { template, to, to_name: toName, payload, priority } = req.body || {};

    if (!isString(template) || !isString(to)) {
      return res.status(400).json({ error: 'template and to are required and must be non-empty strings' });
    }

    const jobId = await enqueueEmail({
      templateName: template,
      to,
      toName,
      payload: payload || {},
      priority: priority || 'normal',
    });

    return res.status(202).json({ success: true, jobId, status: 'queued' });
  } catch (err) {
    console.error('email send error', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Controller: get job status
 * GET /api/v1/email/job/:id
 */
exports.getJob = async (req, res) => {
  try {
    const id = req.params.id;
    if (!isString(id)) return res.status(400).json({ error: 'invalid job id' });

    const job = await getJobStatus(id);
    if (!job) return res.status(404).json({ error: 'job not found' });

    return res.json({ success: true, job });
  } catch (err) {
    console.error('get job error', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Controller: test email
 * GET /api/v1/email/test
 */
exports.testEmail = async (req, res) => {
  try {
    const testRecipient = process.env.TEST_EMAIL || 'test@example.com';
    const jobId = await enqueueEmail({
      templateName: 'invoice.created',
      to: testRecipient,
      toName: 'Test User',
      payload: { client_name: 'Test User', invoice_id: 'INV-TEST-001', amount: '$1.00' },
      priority: 'high',
    });

    return res.json({ success: true, message: 'Test email queued', jobId });
  } catch (err) {
    console.error('test email error', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
