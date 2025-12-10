// src/modules/marketplace/services/pluginEngineIntegration.service.js
module.exports = function PluginEngineIntegration({ pluginEngine, logger }) {
  return {
    async loadPlugin({ folder, manifest }) {
      try {
        const result = await pluginEngine.loadFromFolder(folder, manifest);
        logger.info("Plugin loaded into engine", { folder });
        return result;
      } catch (err) {
        logger.error("Engine load failed", { err });
        throw err;
      }
    },

    async unloadPlugin(pluginId) {
      try {
        return pluginEngine.unload(pluginId);
      } catch (err) {
        logger.error("Unload failed", { err });
      }
    }
  };
};
