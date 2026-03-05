// src/modules/email/controllers/settings.controller.js
const svc = require('../email.service');
const { verifyConnection, loadConfig } = require('../emailProvider');

const SETTING_CATEGORIES = {
  // SMTP
  smtp_host:        { category: 'smtp',     description: 'SMTP server hostname' },
  smtp_port:        { category: 'smtp',     description: 'SMTP port (25/465/587)' },
  smtp_user:        { category: 'smtp',     description: 'SMTP authentication username' },
  smtp_pass:        { category: 'smtp',     description: 'SMTP authentication password' },
  smtp_secure:      { category: 'smtp',     description: 'Use TLS (true/false)' },
  smtp_from_email:  { category: 'smtp',     description: 'From email address' },
  smtp_from_name:   { category: 'smtp',     description: 'From display name' },
  smtp_reply_to:    { category: 'smtp',     description: 'Reply-to address' },
  // Provider
  email_provider:   { category: 'provider', description: 'Active provider: smtp|sendgrid|mailgun|ses|postmark' },
  sendgrid_key:     { category: 'provider', description: 'SendGrid API key' },
  mailgun_key:      { category: 'provider', description: 'Mailgun API key' },
  mailgun_domain:   { category: 'provider', description: 'Mailgun domain' },
  aws_region:       { category: 'provider', description: 'AWS region for SES' },
  postmark_token:   { category: 'provider', description: 'Postmark Server Token' },
  // Branding
  company_name:     { category: 'branding', description: 'Company display name' },
  brand_color:      { category: 'branding', description: 'Primary brand colour (hex)' },
  brand_logo:       { category: 'branding', description: 'Logo image URL' },
  footer_text:      { category: 'branding', description: 'Email footer text' },
  company_address:  { category: 'branding', description: 'Physical company address' },
  support_email:    { category: 'branding', description: 'Support email shown in emails' },
  portal_url:       { category: 'branding', description: 'Client portal URL' },
  docs_url:         { category: 'branding', description: 'Documentation URL' },
};

exports.getAll = async (req, res) => {
  try {
    const { category } = req.query;
    const settings = await svc.getSettings(category);
    // Mask sensitive values
    const masked = Object.fromEntries(
      Object.entries(settings).map(([k, v]) => [k, k.includes('pass') || k.includes('key') || k.includes('token') ? '••••••••' : v])
    );
    return res.json({ success: true, settings: masked });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const updates = req.body || {};
    if (typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ success: false, error: 'Body must be a key-value object' });
    }
    // Annotate with category/description from known keys
    const ops = Object.entries(updates).map(([key, value]) => {
      const meta = SETTING_CATEGORIES[key] || { category: 'general' };
      return svc.setSetting(key, value, meta.category, meta.description);
    });
    await Promise.all(ops);
    return res.json({ success: true, message: 'Settings saved' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getBranding = async (req, res) => {
  try {
    const branding = await svc.getBrandingVars();
    return res.json({ success: true, branding });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.testConnection = async (req, res) => {
  try {
    const result = await verifyConnection();
    return res.json({ success: result.ok, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.sendTestEmail = async (req, res) => {
  try {
    const { enqueueEmail } = require('../email.service');
    const to = req.body?.to || process.env.TEST_EMAIL || 'test@example.com';
    const jobId = await enqueueEmail({
      templateName: 'welcome',
      to,
      toName: 'Test User',
      payload: {
        client_name: 'Test User',
        client_email: to,
        client_id: 'TEST-001',
        portal_url: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
      },
      priority: 'high',
    });
    return res.json({ success: true, message: `Test email queued to ${to}`, jobId });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
