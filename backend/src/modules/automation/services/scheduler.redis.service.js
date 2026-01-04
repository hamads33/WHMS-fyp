/**
 * SchedulerRedisService
 * ------------------------------------------------------------------
 * Responsible for scheduling automation profiles.
 *
 * - Validates and normalizes cron expressions
 * - Schedules profiles using node-cron
 * - Enqueues execution jobs into Redis queues (BullMQ)
 * - Never executes tasks directly
 *
 * Architectural Guarantees:
 * - Scheduling ≠ Execution
 * - DB persistence is NOT coupled to scheduler success
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
    this.isLeader = true; // single-node leader assumption (safe)
  }

  /* ============================================================
     INTERNAL: Normalize cron safely
  ============================================================ */
  _normalizeCron(value) {
    if (typeof value !== "string") return null;

    const normalized = value.trim().replace(/\s+/g, " ");
    const parts = normalized.split(" ");

    // node-cron requires EXACTLY 5 fields
    if (parts.length !== 5) return null;

    return normalized;
  }

  /* ============================================================
     INTERNAL: Validate cron expression (defensive)
  ============================================================ */
  _validateCron(cronExpression) {
    try {
      if (!cronExpression) return false;
      return cron.validate(cronExpression);
    } catch (err) {
      this.logger.error("Cron validation failed:", err);
      return false;
    }
  }

  /* ============================================================
     LOAD & SCHEDULE ALL ENABLED PROFILES
  ============================================================ */
  async loadAndScheduleAll() {
    try {
      const profiles = await this.profileStore.listAll();

      for (const profile of profiles) {
        if (!profile.enabled) continue;

        try {
          this.scheduleProfile(profile);
        } catch (err) {
          this.logger.error(
            `Failed to schedule profile ${profile.id}:`,
            err
          );
        }
      }
    } catch (err) {
      this.logger.error("Failed to load profiles for scheduling:", err);
    }
  }

  /* ============================================================
     SCHEDULE SINGLE PROFILE
  ============================================================ */
  scheduleProfile(profile) {
    if (!this.isLeader) return;
    if (!profile || !profile.cron) return;

    const cronExpr = this._normalizeCron(profile.cron);

    if (!cronExpr || !this._validateCron(cronExpr)) {
      const err = new Error(`Invalid cron expression: ${profile.cron}`);
      this.logger.error(
        `Profile ${profile.id} has invalid cron:`,
        err
      );
      throw err;
    }

    // Stop existing schedule (idempotent)
    if (this.scheduled.has(profile.id)) {
      try {
        this.scheduled.get(profile.id).stop();
      } catch (err) {
        this.logger.warn(
          `Failed to stop previous schedule for profile ${profile.id}:`,
          err
        );
      }
      this.scheduled.delete(profile.id);
    }

    // Create cron job
    const task = cron.schedule(
      cronExpr,
      async () => {
        try {
          this.logger.info(
            `Profile triggered: ${profile.name} (id=${profile.id})`
          );

          await this.audit.automation("profile.trigger", {
            profileId: profile.id,
          });

          const runRecord =
            await this.executionLogStore.createPending(
              profile.id,
              null
            );

          await this.queue.add(
            "run-profile",
            {
              profileId: profile.id,
              runId: runRecord.id,
            },
            {
              attempts: 3,
              backoff: { type: "exponential", delay: 2000 },
              removeOnComplete: true,
            }
          );

          this.logger.debug(
            `Profile ${profile.id} queued (runId=${runRecord.id})`
          );
        } catch (err) {
          this.logger.error(
            `Failed to trigger profile ${profile.id}:`,
            err
          );

          try {
            await this.audit.automation(
              "profile.trigger_failed",
              {
                profileId: profile.id,
                error: err.message,
              },
              "scheduler",
              "ERROR"
            );
          } catch (auditErr) {
            this.logger.error(
              "Failed to audit trigger failure:",
              auditErr
            );
          }
        }
      },
      { scheduled: true }
    );

    this.scheduled.set(profile.id, task);

    try {
      this.audit.automation("profile.scheduled", {
        profileId: profile.id,
        cron: cronExpr,
      });
    } catch (err) {
      this.logger.error("Failed to audit profile scheduling:", err);
    }

    this.logger.debug(
      `Profile ${profile.id} scheduled with cron: ${cronExpr}`
    );
  }

  /* ============================================================
     STOP PROFILE SCHEDULING
  ============================================================ */
  stopProfile(profileId) {
    if (!this.scheduled.has(profileId)) return;

    try {
      this.scheduled.get(profileId).stop();
      this.scheduled.delete(profileId);
      this.logger.debug(`Profile ${profileId} unscheduled`);
    } catch (err) {
      this.logger.error(
        `Failed to unschedule profile ${profileId}:`,
        err
      );
    }

    try {
      this.audit.automation("profile.unscheduled", {
        profileId,
      });
    } catch (err) {
      this.logger.error(
        "Failed to audit profile unscheduling:",
        err
      );
    }
  }

  /* ============================================================
     STOP ALL SCHEDULES
  ============================================================ */
  stopAll() {
    for (const [profileId, task] of this.scheduled.entries()) {
      try {
        task.stop();
        this.logger.debug(`Stopped schedule for profile ${profileId}`);
      } catch (err) {
        this.logger.error(
          `Failed to stop profile ${profileId}:`,
          err
        );
      }
    }

    this.scheduled.clear();
    this.logger.info("All automation profiles unscheduled");
  }

  /* ============================================================
     MANUAL RUN (ASYNC)
  ============================================================ */
  async runProfileNow(profileId) {
    const profile = await this.profileStore.getById(profileId);
    if (!profile) throw new NotFoundError("Profile not found");

    try {
      const runRecord =
        await this.executionLogStore.createPending(profileId);

      await this.queue.add("run-profile", {
        profileId,
        runId: runRecord.id,
      });

      await this.audit.automation(
        "profile.manual_run_queued",
        {
          profileId,
          runId: runRecord.id,
        }
      );

      return runRecord;
    } catch (err) {
      this.logger.error(
        `Failed to queue manual run for profile ${profileId}:`,
        err
      );
      throw err;
    }
  }
}

module.exports = SchedulerRedisService;
