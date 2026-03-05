// src/modules/email/email.service.js
const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const emailQueue = new Queue('emailQueue', { connection });

// ─────────────────────────────────────────────────────────────
// QUEUE / SEND
// ─────────────────────────────────────────────────────────────

async function enqueueEmail({ templateName, to, toName, payload = {}, priority = 'normal', scheduledAt = null }) {
  const id = uuidv4();
  const template = templateName
    ? await prisma.emailTemplate.findUnique({ where: { name: templateName } })
    : null;

  await prisma.emailJob.create({
    data: {
      id,
      templateId: template?.id ?? null,
      templateName,
      toEmail: to,
      toName,
      payload,
      status: 'queued',
      priority,
      scheduledAt,
    },
  });

  const delay = scheduledAt ? Math.max(0, new Date(scheduledAt) - Date.now()) : 0;

  await emailQueue.add('send', { jobId: id }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30000 },
    removeOnComplete: true,
    removeOnFail: false,
    priority: priority === 'high' ? 1 : priority === 'low' ? 10 : 5,
    delay,
  });

  return id;
}

async function getJobStatus(jobId) {
  return prisma.emailJob.findUnique({
    where: { id: jobId },
    include: { events: { orderBy: { createdAt: 'asc' } } },
  });
}

// ─────────────────────────────────────────────────────────────
// TEMPLATE MANAGEMENT
// ─────────────────────────────────────────────────────────────

async function listTemplates({ category, language, status, search, page = 1, limit = 20 } = {}) {
  const where = {};
  if (category) where.category = category;
  if (language) where.language = language;
  if (status) where.status = status;
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { displayName: { contains: search, mode: 'insensitive' } },
    { subject: { contains: search, mode: 'insensitive' } },
  ];

  const [templates, total] = await Promise.all([
    prisma.emailTemplate.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, name: true, displayName: true, subject: true,
        category: true, language: true, status: true, version: true,
        isSystem: true, variables: true, createdAt: true, updatedAt: true,
      },
    }),
    prisma.emailTemplate.count({ where }),
  ]);

  return { templates, total, page, limit, pages: Math.ceil(total / limit) };
}

async function getTemplate(idOrName) {
  const byId = await prisma.emailTemplate.findUnique({ where: { id: idOrName } }).catch(() => null);
  if (byId) return byId;
  return prisma.emailTemplate.findUnique({ where: { name: idOrName } });
}

async function createTemplate(data) {
  const existing = await prisma.emailTemplate.findUnique({ where: { name: data.name } });
  if (existing) throw new Error(`Template with name "${data.name}" already exists`);

  return prisma.emailTemplate.create({
    data: {
      name: data.name,
      displayName: data.displayName || data.name,
      subject: data.subject,
      bodyHtml: data.bodyHtml,
      bodyText: data.bodyText || null,
      category: data.category || 'general',
      language: data.language || 'en',
      status: data.status || 'active',
      isSystem: data.isSystem || false,
      variables: data.variables || [],
    },
  });
}

async function updateTemplate(id, data) {
  const tpl = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!tpl) throw new Error('Template not found');

  return prisma.emailTemplate.update({
    where: { id },
    data: {
      displayName: data.displayName ?? tpl.displayName,
      subject: data.subject ?? tpl.subject,
      bodyHtml: data.bodyHtml ?? tpl.bodyHtml,
      bodyText: data.bodyText !== undefined ? data.bodyText : tpl.bodyText,
      category: data.category ?? tpl.category,
      language: data.language ?? tpl.language,
      status: data.status ?? tpl.status,
      variables: data.variables ?? tpl.variables,
      version: { increment: 1 },
    },
  });
}

async function deleteTemplate(id) {
  const tpl = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!tpl) throw new Error('Template not found');
  if (tpl.isSystem) throw new Error('System templates cannot be deleted');

  const linkedJobs = await prisma.emailJob.count({ where: { templateId: id, status: { in: ['queued', 'processing'] } } });
  if (linkedJobs > 0) throw new Error('Template is linked to active queued jobs. Cannot delete.');

  return prisma.emailTemplate.delete({ where: { id } });
}

async function duplicateTemplate(id, newName) {
  const tpl = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!tpl) throw new Error('Template not found');

  const name = newName || `${tpl.name}_copy_${Date.now()}`;
  return createTemplate({
    name,
    displayName: `${tpl.displayName} (Copy)`,
    subject: tpl.subject,
    bodyHtml: tpl.bodyHtml,
    bodyText: tpl.bodyText,
    category: tpl.category,
    language: tpl.language,
    status: 'inactive',
    variables: tpl.variables,
  });
}

// ─────────────────────────────────────────────────────────────
// EMAIL LOGS
// ─────────────────────────────────────────────────────────────

async function listLogs({ email, subject, status, templateName, dateFrom, dateTo, page = 1, limit = 50 } = {}) {
  const where = {};
  if (email) where.toEmail = { contains: email, mode: 'insensitive' };
  if (subject) where.subject = { contains: subject, mode: 'insensitive' };
  if (status) where.status = status;
  if (templateName) where.templateName = templateName;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo);
  }

  const [logs, total] = await Promise.all([
    prisma.emailJob.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    }),
    prisma.emailJob.count({ where }),
  ]);

  return { logs, total, page, limit, pages: Math.ceil(total / limit) };
}

async function resendEmail(jobId) {
  const job = await prisma.emailJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error('Email job not found');

  return enqueueEmail({
    templateName: job.templateName,
    to: job.toEmail,
    toName: job.toName,
    payload: job.payload || {},
    priority: 'high',
  });
}

// ─────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────

async function getSettings(category) {
  const where = category ? { category } : {};
  const rows = await prisma.emailSetting.findMany({ where });
  return rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
}

async function setSetting(key, value, category = 'general', description) {
  return prisma.emailSetting.upsert({
    where: { key },
    update: { value: String(value), category, description },
    create: { key, value: String(value), category, description },
  });
}

async function bulkSetSettings(settings) {
  const ops = Object.entries(settings).map(([key, value]) =>
    prisma.emailSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })
  );
  return Promise.all(ops);
}

async function getBrandingVars() {
  const settings = await getSettings('branding');
  return {
    company_name: settings.company_name || process.env.COMPANY_NAME || 'WHMS',
    brand_color: settings.brand_color || process.env.BRAND_COLOR || '#4f46e5',
    brand_logo: settings.brand_logo || process.env.BRAND_LOGO || '',
    footer_text: settings.footer_text || '',
    company_address: settings.company_address || '',
    support_email: settings.support_email || process.env.MAIL_FROM_ADDRESS || 'support@example.com',
    portal_url: settings.portal_url || process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
    year: new Date().getFullYear().toString(),
  };
}

// ─────────────────────────────────────────────────────────────
// PREVIEW
// ─────────────────────────────────────────────────────────────

async function previewTemplate(id, samplePayload = {}) {
  const { renderTemplateString } = require('../../utils/templateRenderer');
  const tpl = await getTemplate(id);
  if (!tpl) throw new Error('Template not found');

  const branding = await getBrandingVars();
  const merged = { ...branding, ...samplePayload };

  return {
    subject: renderTemplateString(tpl.subject, merged),
    html: renderTemplateString(tpl.bodyHtml, merged),
    text: tpl.bodyText ? renderTemplateString(tpl.bodyText, merged) : null,
  };
}

module.exports = {
  enqueueEmail,
  getJobStatus,
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  listLogs,
  resendEmail,
  getSettings,
  setSetting,
  bulkSetSettings,
  getBrandingVars,
  previewTemplate,
  prisma,
};
