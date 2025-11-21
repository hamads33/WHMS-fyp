// src/modules/automation/services/scheduler.service.js
const cron = require('node-cron');
const { NotFoundError } = require('../lib/errors');

class SchedulerService {
  constructor({ executor, profileStore, taskStore, executionLogStore, audit, logger }) {
    this.executor = executor;
    this.profileStore = profileStore;
    this.taskStore = taskStore;
    this.executionLogStore = executionLogStore;
    this.audit = audit;
    this.logger = logger;
    this.scheduled = new Map();
    // future: leader election integration point
    this.isLeader = true;
  }

  async loadAndScheduleAll() {
    const profiles = await this.profileStore.listAll();
    for (const p of profiles) {
      if (p.enabled) this.scheduleProfile(p);
    }
  }

  scheduleProfile(profile) {
    if (!this.isLeader) return;
    if (!profile || !profile.cron) return;
    // stop existing
    if (this.scheduled.has(profile.id)) {
      try { this.scheduled.get(profile.id).stop(); } catch (e) {}
      this.scheduled.delete(profile.id);
    }

    const task = cron.schedule(profile.cron, async () => {
      this.logger.info('Profile triggered: %s (id=%d)', profile.name, profile.id);
      await this.audit.log('automation', 'profile.trigger', 'system', { profileId: profile.id });
      const runRecord = await this.executionLogStore.createPending(profile.id, null);
      try {
        await this.executionLogStore.updateStatus(runRecord.id, 'running', { startedAt: new Date() });
        await this._executeProfileTasks(profile.id);
        await this.executionLogStore.complete(runRecord.id, 'success', { message: 'profile run complete' });
        await this.audit.log('automation', 'profile.complete', 'system', { profileId: profile.id, runId: runRecord.id });
      } catch (err) {
        this.logger.error('Profile execution failed: %o', err);
        await this.executionLogStore.complete(runRecord.id, 'failed', null, err.message);
        await this.audit.log('automation', 'profile.failed', 'system', { profileId: profile.id, runId: runRecord.id, error: err.message }, 'ERROR');
      }
    }, { scheduled: true });

    this.scheduled.set(profile.id, task);
  }

  stopProfile(id) {
    if (!this.scheduled.has(id)) return;
    try { this.scheduled.get(id).stop(); } catch (e) {}
    this.scheduled.delete(id);
  }

  stopAll() {
    for (const t of this.scheduled.values()) {
      try { t.stop(); } catch (e) {}
    }
    this.scheduled.clear();
  }

  async _executeProfileTasks(profileId) {
    const tasks = await this.taskStore.listForProfile(profileId);
    // ensure deterministic ordering
    const sorted = tasks.slice().sort((a,b)=> (a.order||0) - (b.order||0));
    for (const t of sorted) {
      const taskRun = await this.executionLogStore.createPending(profileId, t.id);
      await this.executionLogStore.updateStatus(taskRun.id, 'running', { startedAt: new Date() });
      try {
        const result = await this.executor.run({
          id: profileId,
          taskId: t.id,
          actionType: t.actionType,
          actionMeta: t.actionMeta || {}
        });
        await this.executionLogStore.complete(taskRun.id, 'success', result);
        await this.audit.log('automation', 'task.complete', 'system', { profileId, taskId: t.id });
      } catch (err) {
        this.logger.error('Task execution failed: %o', err);
        await this.executionLogStore.complete(taskRun.id, 'failed', null, err.message);
        await this.audit.log('automation', 'task.failed', 'system', { profileId, taskId: t.id, error: err.message }, 'ERROR');
        // decision point: continue with next task (current default)
      }
    }
  }

  // run profile immediately (used by API)
  async runProfileNow(profileId, externalRunId = null) {
    const profile = await this.profileStore.getById(profileId);
    if (!profile) throw new NotFoundError('Profile not found');
    const runRecord = externalRunId ? { id: externalRunId } : await this.executionLogStore.createPending(profileId, null);
    await this.executionLogStore.updateStatus(runRecord.id, 'running', { startedAt: new Date() });
    try {
      await this._executeProfileTasks(profileId);
      await this.executionLogStore.complete(runRecord.id, 'success', { message: 'manual run complete' });
    } catch (err) {
      await this.executionLogStore.complete(runRecord.id, 'failed', null, err.message);
      throw err;
    }
  }
}

module.exports = SchedulerService;
