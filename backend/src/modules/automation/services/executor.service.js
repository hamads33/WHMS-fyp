// src/modules/automation/services/executor.service.js
const BuiltInActions = require('./builtInActions.service');
const { ValidationError } = require('../lib/errors');

class ExecutorBase {
  async run(runSpec) {
    throw new Error('Not implemented');
  }
}

/**
 * BuiltInExecutor: handles actionType starting with 'builtin:'
 * runSpec = { id, taskId, actionType, actionMeta }
 */
class BuiltInExecutor extends ExecutorBase {
  constructor({ logger, prisma, audit }) {
    super();
    this.logger = logger;
    this.prisma = prisma;
    this.audit = audit;
    this.actions = new BuiltInActions({ logger, prisma });
  }

  async run(runSpec = {}) {
    const { actionType, actionMeta, taskId } = runSpec;
    if (!actionType) throw new ValidationError('actionType is required');
    if (!actionType.startsWith('builtin:')) {
      throw new ValidationError('BuiltInExecutor only supports builtin: actions');
    }

    const name = actionType.replace(/^builtin:/, '');
    if (!this.actions[name] || typeof this.actions[name] !== 'function') {
      throw new ValidationError(`Unknown builtin action: ${name}`);
    }

    try {
      this.audit && await this.audit.log('automation', 'action.execute', 'system', { action: name, taskId });
    } catch (e) {
      // ignore
    }

    const result = await Promise.resolve(this.actions[name](actionMeta));
    try {
      this.audit && await this.audit.log('automation', 'action.complete', 'system', { action: name, taskId });
    } catch (e) {}

    return result;
  }
}

module.exports = { ExecutorBase, BuiltInExecutor };
