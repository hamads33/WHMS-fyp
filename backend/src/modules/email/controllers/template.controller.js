// src/modules/email/controllers/template.controller.js
const svc = require('../email.service');

exports.list = async (req, res) => {
  try {
    const { category, language, status, search, page, limit } = req.query;
    const result = await svc.listTemplates({
      category, language, status, search,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.get = async (req, res) => {
  try {
    const tpl = await svc.getTemplate(req.params.id);
    if (!tpl) return res.status(404).json({ success: false, error: 'Template not found' });
    return res.json({ success: true, template: tpl });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, displayName, subject, bodyHtml, bodyText, category, language, status, variables } = req.body || {};
    if (!name || !subject || !bodyHtml) {
      return res.status(400).json({ success: false, error: 'name, subject, and bodyHtml are required' });
    }
    const tpl = await svc.createTemplate({ name, displayName, subject, bodyHtml, bodyText, category, language, status, variables });
    return res.status(201).json({ success: true, template: tpl });
  } catch (err) {
    const code = err.message.includes('already exists') ? 409 : 500;
    return res.status(code).json({ success: false, error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const tpl = await svc.updateTemplate(req.params.id, req.body);
    return res.json({ success: true, template: tpl });
  } catch (err) {
    const code = err.message === 'Template not found' ? 404 : 500;
    return res.status(code).json({ success: false, error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await svc.deleteTemplate(req.params.id);
    return res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    const code = err.message.includes('not found') ? 404 : err.message.includes('cannot be deleted') ? 403 : 500;
    return res.status(code).json({ success: false, error: err.message });
  }
};

exports.duplicate = async (req, res) => {
  try {
    const tpl = await svc.duplicateTemplate(req.params.id, req.body?.newName);
    return res.status(201).json({ success: true, template: tpl });
  } catch (err) {
    const code = err.message === 'Template not found' ? 404 : 500;
    return res.status(code).json({ success: false, error: err.message });
  }
};

exports.preview = async (req, res) => {
  try {
    const result = await svc.previewTemplate(req.params.id, req.body?.variables || {});
    return res.json({ success: true, preview: result });
  } catch (err) {
    const code = err.message === 'Template not found' ? 404 : 500;
    return res.status(code).json({ success: false, error: err.message });
  }
};

exports.categories = (_req, res) => {
  res.json({
    success: true,
    categories: ['account', 'billing', 'orders', 'support', 'security', 'marketing', 'notifications', 'general'],
  });
};
