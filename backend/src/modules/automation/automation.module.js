// src/modules/automation/automation.module.js

const registry = require('./utils/actionRegistry');
const cronRunner = require('./workers/cron.runner');

/**
 * Initializes automation module:
 * - Loads all actions (already loaded at require time)
 * - Reloads actions on demand (if enabled later)
 * - Schedules all profiles
 */
async function init() {
  console.log('[Automation] Initializing automation module...');

  try {
    // reload ensures latest plugins are loaded (optional)
    registry.reload();
    console.log('[Automation] Actions loaded:', registry.listActions().map(a => a.id));

    // schedule all existing profiles
    await cronRunner.scheduleAll();
    console.log('[Automation] All profiles scheduled.');
  } catch (err) {
    console.error('Failed to initialize automation module:', err);
  }
}

module.exports = { init };
