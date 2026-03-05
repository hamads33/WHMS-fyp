// src/modules/email/seed/email.seed.js
// Seeds all prebuilt system email templates into the DB on startup.
// Uses upsert so re-running is safe (idempotent).
// isSystem=true prevents admins from deleting core templates.

const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', '..', '..', 'templates');

function loadHbs(name) {
  const p = path.join(TEMPLATES_DIR, `${name}.hbs`);
  if (!fs.existsSync(p)) return '';
  return fs.readFileSync(p, 'utf8');
}

const SYSTEM_TEMPLATES = [
  // ── Account ─────────────────────────────────────────────────────
  {
    name: 'welcome',
    displayName: 'Welcome Email',
    subject: 'Welcome to {{company_name}}, {{client_name}}!',
    category: 'account',
    isSystem: true,
    variables: [
      'client_name', 'client_email', 'client_id',
      'portal_url', 'support_email', 'company_name',
    ],
  },
  {
    name: 'email-verification',
    displayName: 'Email Verification',
    subject: 'Please verify your email address',
    category: 'account',
    isSystem: true,
    variables: ['client_name', 'verification_url', 'company_name'],
  },
  {
    name: 'password-reset',
    displayName: 'Password Reset',
    subject: 'Password Reset Request – {{company_name}}',
    category: 'security',
    isSystem: true,
    variables: ['client_name', 'reset_url', 'company_name'],
  },
  {
    name: 'account-suspended',
    displayName: 'Account Suspended',
    subject: 'Your account has been suspended',
    category: 'account',
    isSystem: true,
    variables: [
      'client_name', 'suspend_reason', 'suspended_at',
      'outstanding_balance', 'support_url', 'company_name',
    ],
  },
  {
    name: 'security-alert',
    displayName: 'Security Alert',
    subject: 'Security Alert – {{alert_type}}',
    category: 'security',
    isSystem: true,
    variables: [
      'client_name', 'alert_type', 'event_time',
      'ip_address', 'location', 'device', 'security_url', 'company_name',
    ],
  },
  // ── Billing ─────────────────────────────────────────────────────
  {
    name: 'invoice-created',
    displayName: 'Invoice Generated',
    subject: 'Invoice #{{invoice_id}} from {{company_name}}',
    category: 'billing',
    isSystem: true,
    variables: [
      'client_name', 'invoice_id', 'invoice_date', 'due_date',
      'invoice_total', 'subtotal', 'tax_rate', 'tax_amount',
      'line_items', 'invoice_url', 'company_name',
    ],
  },
  {
    name: 'payment-received',
    displayName: 'Payment Received',
    subject: 'Payment Confirmation – Invoice #{{invoice_id}}',
    category: 'billing',
    isSystem: true,
    variables: [
      'client_name', 'invoice_id', 'payment_amount',
      'payment_date', 'payment_method', 'transaction_id',
      'invoice_url', 'company_name',
    ],
  },
  {
    name: 'payment-overdue',
    displayName: 'Payment Overdue Reminder',
    subject: 'OVERDUE: Invoice #{{invoice_id}} – Action Required',
    category: 'billing',
    isSystem: true,
    variables: [
      'client_name', 'invoice_id', 'invoice_total',
      'due_date', 'days_overdue', 'invoice_url',
      'support_email', 'company_name',
    ],
  },
  {
    name: 'refund-issued',
    displayName: 'Refund Issued',
    subject: 'Refund of {{refund_amount}} has been processed',
    category: 'billing',
    isSystem: true,
    variables: [
      'client_name', 'invoice_id', 'refund_amount',
      'refund_date', 'payment_method', 'refund_reason',
      'support_email', 'company_name',
    ],
  },
  // ── Orders ──────────────────────────────────────────────────────
  {
    name: 'order-placed',
    displayName: 'Order Confirmation',
    subject: 'Order #{{order_id}} Confirmed – {{company_name}}',
    category: 'orders',
    isSystem: true,
    variables: [
      'client_name', 'order_id', 'order_date', 'order_status',
      'order_total', 'order_items', 'order_url', 'company_name',
    ],
  },
  // ── Services ────────────────────────────────────────────────────
  {
    name: 'service-activated',
    displayName: 'Service Activated',
    subject: 'Your {{service_name}} service is now active!',
    category: 'orders',
    isSystem: true,
    variables: [
      'client_name', 'service_name', 'service_plan',
      'activation_date', 'next_due_date', 'has_credentials',
      'control_panel_url', 'username', 'password', 'server_ip',
      'portal_url', 'docs_url', 'support_email', 'company_name',
    ],
  },
  {
    name: 'service-suspended',
    displayName: 'Service Suspended',
    subject: 'Your {{service_name}} service has been suspended',
    category: 'orders',
    isSystem: true,
    variables: [
      'client_name', 'service_name', 'suspend_reason',
      'suspended_at', 'retention_days', 'invoice_url',
      'support_email', 'company_name',
    ],
  },
  {
    name: 'service-terminated',
    displayName: 'Service Terminated',
    subject: 'Your {{service_name}} service has been terminated',
    category: 'orders',
    isSystem: true,
    variables: [
      'client_name', 'service_name', 'terminated_at',
      'termination_reason', 'portal_url', 'support_email', 'company_name',
    ],
  },
  // ── Support ─────────────────────────────────────────────────────
  {
    name: 'ticket-created',
    displayName: 'Support Ticket Opened',
    subject: 'Ticket #{{ticket_id}} Opened – {{ticket_subject}}',
    category: 'support',
    isSystem: true,
    variables: [
      'client_name', 'ticket_id', 'ticket_subject',
      'ticket_department', 'ticket_priority', 'ticket_message',
      'ticket_url', 'company_name',
    ],
  },
  {
    name: 'ticket-reply',
    displayName: 'Support Ticket Reply',
    subject: 'New Reply on Ticket #{{ticket_id}} – {{ticket_subject}}',
    category: 'support',
    isSystem: true,
    variables: [
      'client_name', 'ticket_id', 'ticket_subject',
      'ticket_status', 'reply_author', 'reply_date',
      'reply_message', 'ticket_url', 'company_name',
    ],
  },
  {
    name: 'ticket-closed',
    displayName: 'Support Ticket Closed',
    subject: 'Ticket #{{ticket_id}} Has Been Closed',
    category: 'support',
    isSystem: true,
    variables: [
      'client_name', 'ticket_id', 'ticket_subject',
      'closed_at', 'close_reason', 'reopen_days',
      'ticket_url', 'feedback_url', 'company_name',
    ],
  },
];

async function seedEmailTemplates(prisma) {
  console.log('📧 Seeding email templates...');
  let created = 0;
  let skipped = 0;

  for (const tpl of SYSTEM_TEMPLATES) {
    const bodyHtml = loadHbs(tpl.name);
    if (!bodyHtml) {
      console.warn(`  ⚠️  HBS file not found for template "${tpl.name}", skipping`);
      skipped++;
      continue;
    }

    await prisma.emailTemplate.upsert({
      where: { name: tpl.name },
      update: {
        // Only update subject/category/variables for system templates,
        // preserve any admin edits to bodyHtml
        displayName: tpl.displayName,
        subject: tpl.subject,
        category: tpl.category,
        isSystem: true,
        variables: tpl.variables,
      },
      create: {
        name: tpl.name,
        displayName: tpl.displayName,
        subject: tpl.subject,
        bodyHtml,
        category: tpl.category,
        language: 'en',
        status: 'active',
        isSystem: true,
        variables: tpl.variables,
      },
    });
    created++;
  }

  console.log(`✅ Email templates seeded: ${created} upserted, ${skipped} skipped`);
}

// Default branding settings (only inserted if not already set)
const DEFAULT_SETTINGS = [
  { key: 'company_name',    value: process.env.COMPANY_NAME || 'WHMS',         category: 'branding', description: 'Company display name' },
  { key: 'brand_color',     value: process.env.BRAND_COLOR  || '#4f46e5',      category: 'branding', description: 'Primary brand colour (hex)' },
  { key: 'brand_logo',      value: process.env.BRAND_LOGO   || '',             category: 'branding', description: 'Logo image URL' },
  { key: 'footer_text',     value: '',                                          category: 'branding', description: 'Email footer text' },
  { key: 'company_address', value: '',                                          category: 'branding', description: 'Physical company address' },
  { key: 'support_email',   value: process.env.MAIL_FROM_ADDRESS || 'support@example.com', category: 'branding', description: 'Support email shown in emails' },
  { key: 'portal_url',      value: process.env.FRONTEND_ORIGIN   || 'http://localhost:3000', category: 'branding', description: 'Client portal URL' },
  { key: 'docs_url',        value: '',                                          category: 'branding', description: 'Documentation URL' },
  { key: 'email_provider',  value: process.env.EMAIL_PROVIDER || 'smtp',       category: 'provider', description: 'Active email provider' },
];

async function seedEmailSettings(prisma) {
  console.log('⚙️  Seeding default email settings...');
  for (const s of DEFAULT_SETTINGS) {
    await prisma.emailSetting.upsert({
      where: { key: s.key },
      update: {},            // never overwrite admin-saved values
      create: { key: s.key, value: s.value, category: s.category, description: s.description },
    });
  }
  console.log('✅ Email settings seeded');
}

async function seedEmail(prisma) {
  await seedEmailTemplates(prisma);
  await seedEmailSettings(prisma);
}

module.exports = { seedEmail, seedEmailTemplates, seedEmailSettings };
