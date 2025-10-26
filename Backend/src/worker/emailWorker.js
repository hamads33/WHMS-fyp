// src/worker/emailWorker.js
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { loadTemplate, renderTemplateString } = require('../utils/templateRenderer');
const { sendMail, providerName } = require('../providers/emailProvider');
const prisma = new PrismaClient();

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

const worker = new Worker('emailQueue', async job => {
  const { jobId } = job.data;
  console.log('Processing email job', jobId);
  // mark processing
  await prisma.emailJob.update({ where: { id: jobId }, data: { status: 'processing' } });

  const record = await prisma.emailJob.findUnique({ where: { id: jobId } });
  // load template
  let templateString;
  try {
    if (record.templateName) {
      templateString = loadTemplate(record.templateName, 'en'); // expand language support
    } else if (record.templateId) {
      const tpl = await prisma.emailTemplate.findUnique({ where: { id: record.templateId } });
      templateString = tpl.bodyHtml;
    } else {
      throw new Error('No template for job');
    }

    const rendered = renderTemplateString(templateString, record.payload || {});
    const subjectTpl = (await (async () => {
      if (record.templateName) {
        const t = await prisma.emailTemplate.findUnique({ where: { name: record.templateName } });
        return t ? t.subject : 'Notification';
      }
      return 'Notification';
    })());

    const sendRes = await sendMail({
      to: record.toEmail,
      toName: record.toName,
      subject: subjectTpl,
      html: rendered,
      text: record.payload?.text || null,
      jobId,
    });

    // success
    await prisma.emailJob.update({
      where: { id: jobId },
      data: { status: 'sent', attempts: record.attempts + 1, provider: sendRes.provider || providerName },
    });
    await prisma.emailEvent.create({ data: { jobId, eventType: 'sent', providerId: sendRes.id, payload: sendRes } });
    return true;
  } catch (err) {
    console.error('Email worker error', err);
    await prisma.emailJob.update({
      where: { id: jobId },
      data: { attempts: record.attempts + 1, lastError: err.message },
    });

    // log event
    await prisma.emailEvent.create({ data: { jobId, eventType: 'failed', payload: { message: err.message } } });

    // rethrow to let BullMQ handle retry/backoff
    throw err;
  }
}, { connection });

worker.on('failed', (job, err) => {
  console.error('Job failed', job.id, err.message);
});

console.log('Email worker started');
