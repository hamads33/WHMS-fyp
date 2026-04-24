require('dotenv').config();
const { Worker } = require('bullmq');
const redisConnection = require('../config/redis');
const commandRepo = require('../modules/command/command.repository');
const logger = require('../common/utils/logger');

const COMMAND_TIMEOUT_MS = 5 * 60 * 1000;

const worker = new Worker(
  'commands',
  async (job) => {
    const { commandId, tenantId, type } = job.data;
    logger.info(`Processing command job`, { commandId, tenantId, type, attempt: job.attemptsMade });

    const command = await commandRepo.findById(commandId);
    if (!command) {
      logger.warn(`Command ${commandId} not found — skipping`);
      return;
    }

    if (command.status === 'executed' || command.status === 'failed') {
      logger.info(`Command ${commandId} already settled — skipping`);
      return;
    }

    const ageMs = Date.now() - new Date(command.created_at).getTime();
    if (ageMs > COMMAND_TIMEOUT_MS) {
      logger.warn(`Command ${commandId} timed out after ${ageMs}ms`);
      await commandRepo.markExecuted(commandId, false, 'Command timed out — agent did not respond');
    }
  },
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

worker.on('completed', (job) => {
  logger.debug(`Command job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  logger.error(`Command job ${job?.id} failed`, { error: err.message });
});

module.exports = worker;
