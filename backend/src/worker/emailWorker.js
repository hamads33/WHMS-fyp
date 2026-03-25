// src/worker/emailWorker.js
const { Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const { renderTemplateString } = require('../utils/templateRenderer');
const { sendMail } = require('../modules/email/emailProvider');
const { getBrandingVars } = require('../modules/email/email.service');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// ─────────────────────────────────────────────────────────────
// Load a template string: DB first, then file fallback
// ─────────────────────────────────────────────────────────────
function loadTemplateFromFile(name, lang = 'en') {
  const base = path.join(__dirname, '..', 'templates');
  const langPath = path.join(base, `${name}.${lang}.hbs`);
  if (fs.existsSync(langPath)) return fs.readFileSync(langPath, 'utf8');
  const defaultPath = path.join(base, `${name}.hbs`);
  if (fs.existsSync(defaultPath)) return fs.readFileSync(defaultPath, 'utf8');
  return null;
}

async function resolveTemplate(record) {
  // 1. DB template by ID
  if (record.templateId) {
    const tpl = await prisma.emailTemplate.findUnique({ where: { id: record.templateId } });
    if (tpl && tpl.status === 'active') return { html: tpl.bodyHtml, text: tpl.bodyText, subject: tpl.subject };
  }
  // 2. DB template by name
  if (record.templateName) {
    const tpl = await prisma.emailTemplate.findUnique({ where: { name: record.templateName } });
    if (tpl && tpl.status === 'active') return { html: tpl.bodyHtml, text: tpl.bodyText, subject: tpl.subject };
  }
  // 3. File-based fallback
  if (record.templateName) {
    const lang = record.payload?.lang || 'en';
    const html = loadTemplateFromFile(record.templateName, lang);
    if (html) return { html, text: null, subject: null };
  }
  throw new Error(`No usable template found for job ${record.id} (name="${record.templateName}")`);
}

// ─────────────────────────────────────────────────────────────
// WORKER
// ─────────────────────────────────────────────────────────────
const worker = new Worker(
  'emailQueue',
  async (job) => {
    const { jobId } = job.data;
    console.log(`📨 Processing email job ${jobId}`);

    const record = await prisma.emailJob.findUnique({ where: { id: jobId } });
    if (!record) throw new Error(`EmailJob ${jobId} not found`);

    await prisma.emailJob.update({ where: { id: jobId }, data: { status: 'processing' } });

    try {
      const { html: rawHtml, text: rawText, subject: rawSubject } = await resolveTemplate(record);

      // Merge branding + payload
      const branding = await getBrandingVars();
      const context = { ...branding, ...(record.payload || {}) };

      const renderedHtml    = renderTemplateString(rawHtml, context);
      const renderedText    = rawText ? renderTemplateString(rawText, context) : undefined;
      const renderedSubject = rawSubject
        ? renderTemplateString(rawSubject, context)
        : (record.subject || branding.company_name + ' Notification');

      const sendRes = await sendMail({
        to: record.toEmail,
        toName: record.toName,
        subject: renderedSubject,
        html: renderedHtml,
        text: renderedText || '',
        jobId,
      });

      await prisma.emailJob.update({
        where: { id: jobId },
        data: {
          status: 'sent',
          attempts: record.attempts + 1,
          provider: sendRes.provider || 'smtp',
          subject: renderedSubject,
          sentAt: new Date(),
        },
      });

      await prisma.emailEvent.create({
        data: {
          jobId,
          eventType: 'sent',
          providerId: String(sendRes.id || ''),
          payload: sendRes,
        },
      });

      console.log(`✅ Email sent to ${record.toEmail} via ${sendRes.provider}`);
      return true;
    } catch (err) {
      console.error(`❌ Email job ${jobId} failed:`, err.message);

      await prisma.emailJob.update({
        where: { id: jobId },
        data: {
          attempts: record.attempts + 1,
          lastError: err.message,
          status: job.attemptsMade >= (record.maxAttempts ?? 3) - 1 ? 'failed' : 'queued',
        },
      });

      await prisma.emailEvent.create({
        data: { jobId, eventType: 'failed', payload: { message: err.message, attempt: job.attemptsMade + 1 } },
      });

      throw err; // let BullMQ retry
    }
  },
  { connection, concurrency: parseInt(process.env.EMAIL_WORKER_CONCURRENCY || '5', 10) }
);

worker.on('completed', (job) => console.log(`✅ BullMQ job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`💥 BullMQ job ${job?.id} failed:`, err.message));

console.log('🚀 Email worker started');

process.on('SIGINT', async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = worker;
