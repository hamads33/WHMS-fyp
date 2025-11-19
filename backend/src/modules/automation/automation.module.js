// src/modules/automation/automation.module.js
// Module initializer: loads plugins and schedules profiles

const pluginLoader = require('./pluginEngine/pluginLoader');
const cronRunner = require('./workers/cron.runner');

async function init() {
  console.log('[Automation] initializing...');

  try {
    // load builtins + user plugins
    await pluginLoader.loadAll();

    // schedule profiles (reads DB)
    await cronRunner.scheduleAll();

    console.log('[Automation] initialized');
  } catch (err) {
    console.error('[Automation] initialization failed', err);
  }
}

module.exports = { init };
