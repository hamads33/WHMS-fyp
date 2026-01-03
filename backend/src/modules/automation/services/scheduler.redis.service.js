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

  /**
   * Validate cron expression before scheduling
   */
  _validateCron(cronExpression) {
    try {
      // node-cron validates on instantiation
      cron.validate(cronExpression);
      return true;
    } catch (err) {
      this.logger.error(`Invalid cron: ${cronExpression}`, err);
      return false;
    }
  }

  /**
   * Load all enabled profiles and schedule them
   */
  async loadAndScheduleAll() {
    try {
      const profiles = await this.profileStore.listAll();
      for (const p of profiles) {
        if (p.enabled) {
          try {
            this.scheduleProfile(p);
          } catch (err) {
            this.logger.error(`Failed to schedule profile ${p.id}:`, err);
          }
        }
      }
    } catch (err) {
      this.logger.error("Failed to load profiles for scheduling:", err);
    }
  }

  /**
   * Schedule a single profile
   */
  scheduleProfile(profile) {
    if (!this.isLeader) return;
    if (!profile?.cron) return;

    // Validate cron expression
    if (!this._validateCron(profile.cron)) {
      const err = new Error(`Invalid cron expression: ${profile.cron}`);
      this.logger.error(`Profile ${profile.id} has invalid cron:`, err);
      throw err;
    }

    // Unschedule existing
    if (this.scheduled.has(profile.id)) {
      try {
        this.scheduled.get(profile.id).stop();
      } catch (err) {
        this.logger.warn(`Failed to stop previous schedule for profile ${profile.id}:`, err);
      }
      this.scheduled.delete(profile.id);
    }

    // Create new cron task
    const task = cron.schedule(
      profile.cron,
      async () => {
        try {
          this.logger.info(`Profile triggered: ${profile.name} (id=${profile.id})`);

          // Audit the trigger
          await this.audit.automation(
            "profile.trigger",
            { profileId: profile.id }
          );

          // Create pending run record
          const runRecord = await this.executionLogStore.createPending(
            profile.id,
            null
          );

          // Enqueue job
          await this.queue.add(
            "run-profile",
            { profileId: profile.id, runId: runRecord.id },
            {
              attempts: 3,
              backoff: { type: "exponential", delay: 2000 },
              removeOnComplete: true,
            }
          );

          this.logger.debug(`Profile ${profile.id} queued for execution (runId=${runRecord.id})`);
        } catch (err) {
          this.logger.error(`Failed to trigger profile ${profile.id}:`, err);
          
          // Audit the failure
          try {
            await this.audit.automation(
              "profile.trigger_failed",
              { profileId: profile.id, error: err.message },
              "scheduler",
              "ERROR"
            );
          } catch (auditErr) {
            this.logger.error("Failed to audit trigger failure:", auditErr);
          }
        }
      },
      { scheduled: true }
    );

    this.scheduled.set(profile.id, task);

    // Audit scheduling
    try {
      this.audit.automation("profile.scheduled", {
        profileId: profile.id,
        cron: profile.cron,
      });
    } catch (err) {
      this.logger.error(`Failed to audit profile scheduling:`, err);
    }

    this.logger.debug(`Profile ${profile.id} scheduled with cron: ${profile.cron}`);
  }

  /**
   * Stop scheduling for a profile
   */
  stopProfile(id) {
    if (!this.scheduled.has(id)) return;

    try {
      this.scheduled.get(id).stop();
      this.scheduled.delete(id);
      this.logger.debug(`Profile ${id} unscheduled`);
    } catch (err) {
      this.logger.error(`Failed to unschedule profile ${id}:`, err);
    }

    try {
      this.audit.automation("profile.unscheduled", { profileId: id });
    } catch (err) {
      this.logger.error("Failed to audit profile unscheduling:", err);
    }
  }

  /**
   * Stop all scheduled profiles
   */
  stopAll() {
    for (const [profileId, task] of this.scheduled.entries()) {
      try {
        task.stop();
        this.logger.debug(`Stopped schedule for profile ${profileId}`);
      } catch (err) {
        this.logger.error(`Failed to stop profile ${profileId}:`, err);
      }
    }
    this.scheduled.clear();
    this.logger.info("All profiles unscheduled");
  }

  /**
   * Manually run a profile now (async)
   */
  async runProfileNow(profileId) {
    const profile = await this.profileStore.getById(profileId);
    if (!profile) throw new NotFoundError("Profile not found");

    try {
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
    } catch (err) {
      this.logger.error(`Failed to queue profile ${profileId} for manual run:`, err);
      throw err;
    }
  }
}

module.exports = SchedulerRedisService;