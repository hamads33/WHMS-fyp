const customFieldService = require("../services/service-custom-field.service");

class ServiceCustomFieldController {
  async create(req, res) {
    try {
      const field = await customFieldService.create(req.params.id, req.body);
      res.status(201).json(field);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async list(req, res) {
    try {
      const fields = await customFieldService.listByService(req.params.id);
      res.json({ customFields: fields });
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async update(req, res) {
    try {
      const field = await customFieldService.update(req.params.fieldId, req.body);
      res.json(field);
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async delete(req, res) {
    try {
      await customFieldService.delete(req.params.fieldId);
      res.status(204).send();
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }

  async reorder(req, res) {
    try {
      await customFieldService.reorder(req.body.fields);
      res.json({ success: true });
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  }
}

module.exports = new ServiceCustomFieldController();
