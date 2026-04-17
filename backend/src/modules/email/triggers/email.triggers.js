// src/modules/email/triggers/email.triggers.js
//
// Central event-driven email trigger dispatcher.
// Usage: emailTriggers.fire('user.registered', { ... })
//
const prisma = require('../../../../prisma');
const { enqueueEmail } = require('../email.service');

// ─────────────────────────────────────────────────────────────
// TRIGGER MAP  —  event → { template, priority, buildPayload }
// ─────────────────────────────────────────────────────────────
const TRIGGER_MAP = {
  // ── Account ──────────────────────────────────────────────
  'user.registered': {
    template: 'welcome',
    priority: 'high',
    build: (d) => ({
      to: d.email,
      toName: d.name,
      payload: {
        client_name: d.name,
        client_email: d.email,
        client_id: d.id,
        portal_url: d.portalUrl,
        support_email: d.supportEmail,
      },
    }),
  },

  'user.email_verification': {
    template: 'email-verification',
    priority: 'high',
    build: (d) => ({
      to: d.email,
      toName: d.name,
      payload: {
        client_name: d.name,
        verification_url: d.verificationUrl,
      },
    }),
  },

  'user.password_reset': {
    template: 'password-reset',
    priority: 'high',
    build: (d) => ({
      to: d.email,
      toName: d.name,
      payload: {
        client_name: d.name,
        reset_url: d.resetUrl,
      },
    }),
  },

  'user.account_suspended': {
    template: 'account-suspended',
    priority: 'high',
    build: (d) => ({
      to: d.email,
      toName: d.name,
      payload: {
        client_name: d.name,
        suspend_reason: d.reason,
        suspended_at: d.suspendedAt ? new Date(d.suspendedAt).toLocaleDateString() : '',
        outstanding_balance: d.outstandingBalance,
        support_url: d.supportUrl,
      },
    }),
  },

  'user.security_alert': {
    template: 'security-alert',
    priority: 'high',
    build: (d) => ({
      to: d.email,
      toName: d.name,
      payload: {
        client_name: d.name,
        alert_type: d.alertType,
        event_time: d.eventTime,
        ip_address: d.ipAddress,
        location: d.location,
        device: d.device,
        security_url: d.securityUrl,
      },
    }),
  },

  // ── Billing ───────────────────────────────────────────────
  'billing.invoice_created': {
    template: 'invoice-created',
    priority: 'normal',
    build: (d) => ({
      to: d.clientEmail,
      toName: d.clientName,
      payload: {
        client_name: d.clientName,
        invoice_id: d.invoiceId,
        invoice_date: d.invoiceDate,
        due_date: d.dueDate,
        invoice_total: d.total,
        subtotal: d.subtotal,
        tax_rate: d.taxRate,
        tax_amount: d.taxAmount,
        line_items: d.lineItems || [],
        invoice_url: d.invoiceUrl,
      },
    }),
  },

  'billing.payment_received': {
    template: 'payment-received',
    priority: 'high',
    build: (d) => ({
      to: d.clientEmail,
      toName: d.clientName,
      payload: {
        client_name: d.clientName,
        invoice_id: d.invoiceId,
        payment_amount: d.amount,
        payment_date: d.paymentDate,
        payment_method: d.method,
        transaction_id: d.transactionId,
        invoice_url: d.invoiceUrl,
      },
    }),
  },

  'billing.payment_overdue': {
    template: 'payment-overdue',
    priority: 'high',
    build: (d) => ({
      to: d.clientEmail,
      toName: d.clientName,
      payload: {
        client_name: d.clientName,
        invoice_id: d.invoiceId,
        invoice_total: d.total,
        due_date: d.dueDate,
        days_overdue: d.daysOverdue,
        invoice_url: d.invoiceUrl,
        support_email: d.supportEmail,
      },
    }),
  },

  'billing.refund_issued': {
    template: 'refund-issued',
    priority: 'normal',
    build: (d) => ({
      to: d.clientEmail,
      toName: d.clientName,
      payload: {
        client_name: d.clientName,
        invoice_id: d.invoiceId,
        refund_amount: d.amount,
        refund_date: d.refundDate,
        payment_method: d.method,
        refund_reason: d.reason,
        support_email: d.supportEmail,
      },
    }),
  },

  // ── Orders ────────────────────────────────────────────────
  'order.placed': {
    template: 'order-placed',
    priority: 'high',
    build: (d) => ({
      to: d.clientEmail,
      toName: d.clientName,
      payload: {
        client_name: d.clientName,
        order_id: d.orderId,
        order_date: d.orderDate,
        order_status: d.status,
        order_total: d.total,
        order_items: d.items || [],
        order_url: d.orderUrl,
      },
    }),
  },

  // ── Services ──────────────────────────────────────────────
  'service.activated': {
    template: 'service-activated',
    priority: 'high',
    build: (d) => ({
      to: d.clientEmail,
      toName: d.clientName,
      payload: {
        client_name: d.clientName,
        service_name: d.serviceName,
        service_plan: d.plan,
        activation_date: d.activatedAt,
        next_due_date: d.nextDueDate,
        has_credentials: !!(d.username || d.password),
        control_panel_url: d.controlPanelUrl,
        username: d.username,
        password: d.password,
        server_ip: d.serverIp,
        portal_url: d.portalUrl,
        docs_url: d.docsUrl,
        support_email: d.supportEmail,
      },
    }),
  },

  'service.suspended': {
    template: 'service-suspended',
    priority: 'high',
    build: (d) => ({
      to: d.clientEmail,
      toName: d.clientName,
      payload: {
        client_name: d.clientName,
        service_name: d.serviceName,
        suspend_reason: d.reason,
        suspended_at: d.suspendedAt,
        retention_days: d.retentionDays || 30,
        invoice_url: d.invoiceUrl,
        support_email: d.supportEmail,
      },
    }),
  },

  'service.terminated': {
    template: 'service-terminated',
    priority: 'normal',
    build: (d) => ({
      to: d.clientEmail,
      toName: d.clientName,
      payload: {
        client_name: d.clientName,
        service_name: d.serviceName,
        terminated_at: d.terminatedAt,
        termination_reason: d.reason,
        portal_url: d.portalUrl,
        support_email: d.supportEmail,
      },
    }),
  },

  // ── Support ───────────────────────────────────────────────
  'support.ticket_created': {
    template: 'ticket-created',
    priority: 'normal',
    build: (d) => ({
      to: d.clientEmail,
      toName: d.clientName,
      payload: {
        client_name: d.clientName,
        ticket_id: d.ticketId,
        ticket_subject: d.subject,
        ticket_department: d.department,
        ticket_priority: d.priority,
        ticket_message: d.message,
        ticket_url: d.ticketUrl,
      },
    }),
  },

  'support.ticket_reply': {
    template: 'ticket-reply',
    priority: 'high',
    build: (d) => ({
      to: d.clientEmail,
      toName: d.clientName,
      payload: {
        client_name: d.clientName,
        ticket_id: d.ticketId,
        ticket_subject: d.subject,
        ticket_status: d.status,
        reply_author: d.replyAuthor,
        reply_date: d.replyDate,
        reply_message: d.replyMessage,
        ticket_url: d.ticketUrl,
      },
    }),
  },

  'support.ticket_closed': {
    template: 'ticket-closed',
    priority: 'normal',
    build: (d) => ({
      to: d.clientEmail,
      toName: d.clientName,
      payload: {
        client_name: d.clientName,
        ticket_id: d.ticketId,
        ticket_subject: d.subject,
        closed_at: d.closedAt,
        close_reason: d.reason,
        reopen_days: d.reopenDays || 7,
        ticket_url: d.ticketUrl,
        feedback_url: d.feedbackUrl || d.ticketUrl,
      },
    }),
  },
};

// ─────────────────────────────────────────────────────────────
// PLUGIN EXTENSIONS
// ─────────────────────────────────────────────────────────────
const pluginTriggers = {};

function registerTrigger(eventName, config) {
  if (!config.template || typeof config.build !== 'function') {
    throw new Error('Trigger config requires { template, build } fields');
  }
  pluginTriggers[eventName] = config;
}

// ─────────────────────────────────────────────────────────────
// CHECK NOTIFICATION ENABLED
// ─────────────────────────────────────────────────────────────
async function notificationEnabled(eventName) {
  const key = `notifications.${eventName}`;
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    if (setting === null) return true;
    return setting.value !== false && setting.value !== 'false';
  } catch (err) {
    console.warn(`[EmailTrigger] Failed to check notification setting for ${eventName}:`, err.message);
    return true;
  }
}

// ─────────────────────────────────────────────────────────────
// FIRE
// ─────────────────────────────────────────────────────────────
async function fire(eventName, data = {}) {
  const config = TRIGGER_MAP[eventName] || pluginTriggers[eventName];
  if (!config) {
    console.warn(`[EmailTrigger] No trigger registered for event: ${eventName}`);
    return null;
  }

  // Check if this notification is enabled
  if (!(await notificationEnabled(eventName))) {
    console.log(`[EmailTrigger] Notification disabled for event: ${eventName}`);
    return null;
  }

  try {
    const { to, toName, payload } = config.build(data);
    if (!to) throw new Error(`Trigger "${eventName}" build() returned no recipient`);

    const jobId = await enqueueEmail({
      templateName: config.template,
      to,
      toName,
      payload,
      priority: config.priority || 'normal',
    });
    console.log(`[EmailTrigger] Fired ${eventName} → job ${jobId}`);
    return jobId;
  } catch (err) {
    console.error(`[EmailTrigger] Failed to fire ${eventName}:`, err.message);
    return null;
  }
}

module.exports = { fire, registerTrigger, TRIGGER_MAP };
