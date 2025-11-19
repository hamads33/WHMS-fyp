// src/modules/automation/workers/cron.runner.js
// Non-breaking improved version: safer scheduling, no overlapping runs,
// isolated task failures, stable logging, and zero changes to external behavior.

const cron = require("node-cron");
const profileRepo = require("../repositories/profile.repo");
const taskRepo = require("../repositories/task.repo");
const automationService = require("../services/automation.service");
const { log, error } = require("../utils/logger");

const scheduled = new Map();
const runningProfiles = new Set(); // prevent overlap

async function scheduleAll() {
  const profiles = await profileRepo.listProfiles();
  for (const p of profiles) scheduleProfile(p);
  return scheduled;
}

function scheduleProfile(profile) {
  try {
    if (!profile || !profile.isActive) return;

    // Stop old job
    if (scheduled.has(profile.id)) {
      try { scheduled.get(profile.id).stop(); } catch {}
      scheduled.delete(profile.id);
    }

    if (!profile.cron || !cron.validate(profile.cron)) {
      error(`cron.runner: invalid or empty cron expression for profile ${profile.id}`);
      return;
    }

    // Schedule new job
    const job = cron.schedule(
      profile.cron,
      async () => {
        // 🔥 Non-breaking: overlap protection
        if (runningProfiles.has(profile.id)) {
          return log(
            `cron.runner: skipped overlapping run of profile ${profile.id}`
          );
        }

        runningProfiles.add(profile.id);
        log(`Profile triggered: ${profile.name} (id=${profile.id})`);

        try {
          const tasks = await taskRepo.listTasksByProfile(profile.id);

          // Run tasks sequentially by order
          for (const t of tasks.filter(x => x.isActive).sort((a, b) => a.order - b.order)) {
            try {
              await automationService.executeTaskRun(t);
            } catch (taskErr) {
              error(`cron.runner: Task ${t.id} failed`, {
                taskId: t.id,
                profileId: profile.id,
                message: taskErr.message
              });
            }
          }
        } catch (err) {
          error(`cron.runner: profile run failed`, {
            profileId: profile.id,
            message: err.message
          });
        } finally {
          runningProfiles.delete(profile.id);
        }
      },
      { scheduled: profile.isActive }
    );

    scheduled.set(profile.id, job);
    log(`Scheduled profile ${profile.name} -> ${profile.cron}`);

  } catch (err) {
    error("cron.runner: failed to schedule profile", {
      profileId: profile && profile.id,
      message: err.message
    });
  }
}

function unscheduleProfile(profileId) {
  const job = scheduled.get(profileId);
  if (job) {
    try { job.stop(); } catch {}
    scheduled.delete(profileId);
    log(`Unscheduled profile ${profileId}`);
  }
}

module.exports = {
  scheduleProfile,
  scheduleAll,
  unscheduleProfile,
  scheduled
};
