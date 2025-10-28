// src/services/emailService.js
const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

const emailQueue = new Queue('emailQueue', { connection });

async function enqueueEmail({ templateName, to, toName, payload = {}, priority = 'normal' }) {
  // create job record in DB
  const id = uuidv4();
  const template = await prisma.emailTemplate.findUnique({ where: { name: templateName } });
  const templateId = template ? template.id : null;
  await prisma.emailJob.create({
    data: {
      id,
      templateId,
      templateName,
      toEmail: to,
      toName,
      payload,
      status: 'queued',
      priority,
    },
  });

  // publish to queue
  await emailQueue.add('send', { jobId: id }, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 60000 }, // 1m, then backoff
    removeOnComplete: true,
    removeOnFail: false,
    priority: priority === 'high' ? 1 : 5,
  });

  return id;
}

async function getJobStatus(jobId) {
  return prisma.emailJob.findUnique({ where: { id: jobId } });
}

module.exports = { enqueueEmail, getJobStatus, prisma };
