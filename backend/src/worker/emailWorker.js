const { Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const { loadTemplate, renderTemplateString } = require('../utils/templateRenderer');
const { sendMail, providerName } = require('../modules/email/emailProvider');

const prisma = new PrismaClient();

const connection = {
  host: 'localhost', // use "redis" if inside Docker network
  port: 6379,
  maxRetriesPerRequest: null,  // ✅ required for BullMQ v4+
  enableReadyCheck: false,
};

const worker = new Worker(
  'emailQueue',
  async (job) => {
    const { jobId } = job.data;
    console.log(`📨 Processing email job ${jobId}`);

    const record = await prisma.emailJob.findUnique({ where: { id: jobId } });
    if (!record) throw new Error(`EmailJob ${jobId} not found`);

    await prisma.emailJob.update({
      where: { id: jobId },
      data: { status: 'processing' },
    });

    try {
      // Load HTML template
      let templateString;
      if (record.templateName) {
        templateString = loadTemplate(record.templateName, 'en');
      } else if (record.templateId) {
        const tpl = await prisma.emailTemplate.findUnique({ where: { id: record.templateId } });
        templateString = tpl?.bodyHtml || '';
      } else {
        throw new Error('No template specified for email job.');
      }

      // Render placeholders with payload data
      const renderedHtml = renderTemplateString(templateString, record.payload || {});
      const templateObj = await prisma.emailTemplate.findUnique({
        where: { name: record.templateName },
      });
      const subject = templateObj?.subject || 'Notification';

      // Send email using provider
      const sendRes = await sendMail({
        to: record.toEmail,
        toName: record.toName,
        subject,
        html: renderedHtml,
        text: record.payload?.text || '',
        jobId,
      });

      // Mark as sent
      await prisma.emailJob.update({
        where: { id: jobId },
        data: {
          status: 'sent',
          attempts: record.attempts + 1,
          provider: sendRes.provider || providerName,
        },
      });

      // Log success event
      await prisma.emailEvent.create({
        data: {
          jobId,
          eventType: 'sent',
          providerId: sendRes.id || null,
          payload: sendRes,
        },
      });

      console.log(`✅ Email sent successfully to ${record.toEmail}`);
      return true;
    } catch (err) {
      console.error(`❌ Email worker error for job ${jobId}:`, err.message);

      await prisma.emailJob.update({
        where: { id: jobId },
        data: {
          attempts: record.attempts + 1,
          lastError: err.message,
          status: 'failed',
        },
      });

      await prisma.emailEvent.create({
        data: {
          jobId,
          eventType: 'failed',
          payload: { message: err.message },
        },
      });

      // Let BullMQ handle retries/backoff
      throw err;
    }
  },
  { connection }
);

worker.on('completed', (job) => console.log(`✅ Job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`💥 Job ${job.id} failed:`, err.message));

console.log('🚀 Email worker started and connected to Redis');

process.on('SIGINT', async () => {
  console.log('⚙️  Gracefully shutting down worker...');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
