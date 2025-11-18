const cron = require('node-cron');
const profileRepo = require('../repositories/profile.repo');
const taskRepo = require('../repositories/task.repo');
const automationService = require('../services/automation.service');
const { log, error } = require('../utils/logger');

const scheduled = new Map();

async function scheduleAll() {
  const profiles = await profileRepo.listProfiles();
  for (const p of profiles) scheduleProfile(p);
}

function scheduleProfile(profile) {
  try {
    if (!profile.isActive) return;
    if (scheduled.has(profile.id)) {
      scheduled.get(profile.id).stop();
      scheduled.delete(profile.id);
    }
    const job = cron.schedule(profile.cron, async () => {
      try {
        log(`Profile triggered: ${profile.name}`);
        const tasks = await taskRepo.listTasksByProfile(profile.id);
        for (const t of tasks) {
          if (!t.isActive) continue;
          try {
            await automationService.executeTaskRun(t).catch(err => error('Task failed', t.id, err));
          } catch (err) {
            error('Task run error', err);
          }
        }
      } catch (err) { error('Profile run failed', profile.id, err); }
    }, { scheduled: profile.isActive });
    scheduled.set(profile.id, job);
    log(`Scheduled profile ${profile.name} -> ${profile.cron}`);
  } catch (err) { error('Failed to schedule profile', profile.id, err); }
}

module.exports = { scheduleProfile, scheduleAll, scheduled };
