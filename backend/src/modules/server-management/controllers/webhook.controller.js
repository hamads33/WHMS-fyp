const webhookService = require("../services/webhook.service");

exports.list = async (req, res) => {
  try {
    const hooks = await webhookService.listWebhooks();
    res.json({ data: hooks, total: hooks.length, validEvents: webhookService.VALID_EVENTS });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const hook = await webhookService.getWebhook(req.params.id);
    res.json(hook);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.create = async (req, res) => {
  try {
    const hook = await webhookService.createWebhook(req.body);
    res.status(201).json(hook);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const hook = await webhookService.updateWebhook(req.params.id, req.body);
    res.json(hook);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await webhookService.deleteWebhook(req.params.id);
    res.status(204).send();
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};
