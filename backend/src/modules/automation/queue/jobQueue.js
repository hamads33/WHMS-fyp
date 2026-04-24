/**
 * jobQueue
 * ------------------------------------------------------------------
 * Centralized BullMQ queue initialization.
 *
 * Responsibilities:
 *  - Configure Redis connection correctly (BullMQ v5)
 *  - Provide queue instances to scheduler and workers
 *
 * Why centralized:
 *  - Prevents misconfiguration
 *  - Ensures consistent retry and backoff behavior
 */

/**
 * jobQueue.js
 * -----------------------------------------
 * BullMQ v5-compatible queue initialization.
 *
 * IMPORTANT:
 *  - QueueScheduler NO LONGER EXISTS in v5.
 *  - We must explicitly set:
 *        maxRetriesPerRequest: null
 *        enableReadyCheck: false
 *    These are REQUIRED or BullMQ will throw errors.
 *
 * Used by:
 *  - scheduler.redis.service.js
 *  - worker.js
 */

const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

function createQueue(name = "automation") {
  // Dedicated Redis connection for queue instance
  const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,   // REQUIRED for BullMQ v5
    enableReadyCheck: false       // REQUIRED for BullMQ v5
  });

  const queue = new Queue(name, {
    connection
  });

  return {
    queue,
    connection
  };
}

module.exports = { createQueue };
