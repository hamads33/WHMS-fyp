/**
 * SchedulerRedisService
 * ------------------------------------------------------------------
 * Responsible for scheduling automation profiles.
 *
 * Key Responsibilities:
 *  - Interpret cron expressions
 *  - Enqueue execution jobs into Redis queues
 *  - Never execute tasks directly
 *
 * Important Architectural Rule:
 *  - Scheduling ≠ Execution
 *
 * Design Choices:
 *  - node-cron for time triggering
 *  - BullMQ for distributed execution
 *
 * Scalability Note:
 *  - Leader election simplified for single-node deployment
 *  - Can be extended for multi-node systems
 */

const cron = require("node-cron");
const { createQueue } = require("../queue/jobQueue");
const { NotFoundError } = require("../lib/errors");

class SchedulerRedisService {
  constructor({
    profileStore,
    taskStore,
    executionLogStore,
    audit,
    logger,
    queueName = "automation",
  }) {
    this.profileStore = profileStore;
    this.taskStore = taskStore;
    this.executionLogStore = executionLogStore;
    this.audit = audit;
    this.logger = logger;

    const { queue } = createQueue(queueName);
    this.queue = queue;

    this.scheduled = new Map();
    this.isLeader = true; // multi-node support later
  }

  async loadAndScheduleAll() {
    const profiles = await this.profileStore.listAll();
    for (const p of profiles) {
      if (p.enabled) this.scheduleProfile(p);
    }
  }

  scheduleProfile(profile) {
    if (!this.isLeader) return;
    if (!profile?.cron) return;

    // unschedule existing
    if (this.scheduled.has(profile.id)) {
      try {
        this.scheduled.get(profile.id).stop();
      } catch {}
      this.scheduled.delete(profile.id);
    }

    const task = cron.schedule(
      profile.cron,
      async () => {
        this.logger.info(`Profile triggered: ${profile.name} (id=${profile.id})`);

        await this.audit.automation("profile.trigger", { profileId: profile.id });

        const runRecord = await this.executionLogStore.createPending(
          profile.id,
          null
        );

        await this.queue.add(
          "run-profile",
          { profileId: profile.id, runId: runRecord.id },
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
            removeOnComplete: true,
          }
        );
      },
      { scheduled: true }
    );

    this.scheduled.set(profile.id, task);

    // AUDIT scheduling
    this.audit.automation("profile.scheduled", {
      profileId: profile.id,
      cron: profile.cron,
    });
  }

  stopProfile(id) {
    if (!this.scheduled.has(id)) return;
    try {
      this.scheduled.get(id).stop();
    } catch {}
    this.scheduled.delete(id);

    this.audit.automation("profile.unscheduled", { profileId: id });
  }

  stopAll() {
    for (const t of this.scheduled.values()) {
      try {
        t.stop();
      } catch {}
    }
    this.scheduled.clear();
  }

  async runProfileNow(profileId) {
    const profile = await this.profileStore.getById(profileId);
    if (!profile) throw new NotFoundError("Profile not found");

    const runRecord = await this.executionLogStore.createPending(profileId);

    await this.queue.add("run-profile", {
      profileId,
      runId: runRecord.id,
    });

    await this.audit.automation("profile.manual_run_queued", {
      profileId,
      runId: runRecord.id,
    });

    return runRecord;
  }
}

module.exports = SchedulerRedisService;
