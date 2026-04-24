// src/modules/email/controllers/log.controller.js
const svc = require('../email.service');

exports.list = async (req, res) => {
  try {
    const { email, subject, status, templateName, dateFrom, dateTo, page, limit } = req.query;
    const result = await svc.listLogs({
      email, subject, status, templateName, dateFrom, dateTo,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.get = async (req, res) => {
  try {
    const job = await svc.getJobStatus(req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Log not found' });
    return res.json({ success: true, log: job });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.resend = async (req, res) => {
  try {
    const newJobId = await svc.resendEmail(req.params.id);
    return res.status(202).json({ success: true, newJobId, status: 'queued' });
  } catch (err) {
    const code = err.message === 'Email job not found' ? 404 : 500;
    return res.status(code).json({ success: false, error: err.message });
  }
};

exports.stats = async (req, res) => {
  try {
    const { prisma } = svc;
    const [total, sent, failed, queued] = await Promise.all([
      prisma.emailJob.count(),
      prisma.emailJob.count({ where: { status: 'sent' } }),
      prisma.emailJob.count({ where: { status: 'failed' } }),
      prisma.emailJob.count({ where: { status: { in: ['queued', 'processing'] } } }),
    ]);
    return res.json({ success: true, stats: { total, sent, failed, queued, deliveryRate: total ? Math.round((sent / total) * 100) : 0 } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
