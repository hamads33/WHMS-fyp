// src/modules/backup/eventBus.js
const EventEmitter = require("events");
const bus = new EventEmitter();

// Automation engine loader
let automationEngine = null;
try {
  automationEngine = require("../../automation/engine");  // adjust path
} catch (err) {
  console.warn("Automation engine not available yet.");
}

// Plugin hook system
let pluginSystem = null;
try {
  pluginSystem = require("../../plugins/system"); // adjust path
} catch (err) {
  console.warn("Plugin system not available yet.");
}

function emitEvent(event, payload) {
  bus.emit(event, payload);

  // Forward to automation engine
  if (automationEngine && automationEngine.handleEvent) {
    automationEngine.handleEvent(event, payload).catch(err => {
      console.error("Automation engine error:", err);
    });
  }

  // Forward to plugins
  if (pluginSystem && pluginSystem.triggerHook) {
    pluginSystem.triggerHook(event, payload).catch(err => {
      console.error("Plugin hook error:", err);
    });
  }
}

module.exports = {
  on: (...args) => bus.on(...args),
  emit: emitEvent
};
