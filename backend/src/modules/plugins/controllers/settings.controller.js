// src/modules/plugins/controllers/settings.controller.js
class SettingsController {
  constructor({ prisma }) {
    this.prisma = prisma;
  }

  async list(req, res, next) {
    try {
      const pluginId = req.params.pluginId;
      const settings = await this.prisma.pluginSetting.findMany({ where: { pluginId } });
      return res.json({ success: true, data: settings });
    } catch (err) {
      next(err);
    }
  }

  async upsert(req, res, next) {
    try {
      const pluginId = req.params.pluginId;
      const { key, value } = req.body;
      const existing = await this.prisma.pluginSetting.findFirst({ where: { pluginId, key } });
      if (existing) {
        const updated = await this.prisma.pluginSetting.update({
          where: { id: existing.id },
          data: { value }
        });
        return res.json({ success: true, data: updated });
      } else {
        const created = await this.prisma.pluginSetting.create({ data: { pluginId, key, value } });
        return res.json({ success: true, data: created });
      }
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SettingsController;
