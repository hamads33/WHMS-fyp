import { v4 as uuidv4 } from 'uuid';

function id(type) { return `${type}-${uuidv4().slice(0, 8)}`; }

export const PRESETS = [
  // ── Account ──────────────────────────────────────────────────────────────────
  {
    key: 'welcome',
    label: 'Welcome Email',
    description: 'Sent when a new user registers',
    category: 'account',
    subject: 'Welcome to {{company.name}}, {{client.name}}!',
    blocks: [
      {
        id: id('hero'), type: 'hero',
        props: {
          title: 'Welcome to {{company.name}}! 🎉',
          subtitle: 'Your account is ready. Log in to get started.',
          bgColor: '#4f46e5', textColor: '#ffffff',
          buttonLabel: 'Go to Client Portal', buttonUrl: '{{portal.url}}',
          buttonBgColor: '#ffffff', buttonTextColor: '#4f46e5',
          padding: '52px 40px', align: 'center',
        },
      },
      {
        id: id('heading'), type: 'heading',
        props: { content: 'Hi {{client.name}},', fontSize: '22px', align: 'left', color: '#111827', padding: '32px 40px 0' },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'Thank you for creating an account with {{company.name}}. You can now log in to your client portal to manage your services, view invoices, and get support.',
          fontSize: '15px', align: 'left', color: '#4b5563', padding: '12px 40px',
        },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'Your account details:\n• Email: {{client.email}}\n• Account ID: {{client.id}}',
          fontSize: '15px', align: 'left', color: '#374151', padding: '4px 40px 20px',
        },
      },
      {
        id: id('button'), type: 'button',
        props: {
          label: 'Access My Account', url: '{{portal.url}}', align: 'left',
          bgColor: '#4f46e5', textColor: '#ffffff', padding: '13px 28px',
          borderRadius: '6px', fontSize: '15px', blockPadding: '4px 40px 32px',
        },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px' } },
      {
        id: id('footer'), type: 'footer',
        props: {
          text: '© {{company.name}} · All rights reserved.',
          subtext: 'If you did not create this account, please ignore this email or contact {{company.email}}.',
          bgColor: '#f8f9fb', textColor: '#6b7280', fontSize: '13px', align: 'center', padding: '28px 40px',
        },
      },
    ],
  },

  {
    key: 'email-verification',
    label: 'Email Verification',
    description: 'Verify a new account email address',
    category: 'account',
    subject: 'Please verify your email address – {{company.name}}',
    blocks: [
      {
        id: id('heading'), type: 'heading',
        props: { content: '{{company.name}}', fontSize: '22px', align: 'center', color: '#4f46e5', padding: '32px 40px 4px' },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px 28px' } },
      {
        id: id('heading'), type: 'heading',
        props: { content: 'Confirm your email address', fontSize: '26px', align: 'center', color: '#111827', padding: '0 40px 12px' },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'Hi {{client.name}},\n\nThanks for signing up! Click the button below to verify your email address and activate your account. This link expires in 24 hours.',
          fontSize: '15px', align: 'center', color: '#4b5563', padding: '0 40px 24px',
        },
      },
      {
        id: id('button'), type: 'button',
        props: {
          label: 'Verify Email Address', url: '{{verification.url}}', align: 'center',
          bgColor: '#059669', textColor: '#ffffff', padding: '14px 36px',
          borderRadius: '8px', fontSize: '15px', blockPadding: '4px 40px 24px',
        },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'Or copy and paste this link into your browser:\n{{verification.url}}',
          fontSize: '12px', align: 'center', color: '#9ca3af', padding: '0 40px 28px',
        },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px' } },
      {
        id: id('footer'), type: 'footer',
        props: {
          text: '© {{company.name}} · All rights reserved.',
          subtext: 'If you did not create this account, please disregard this email.',
          bgColor: '#f8f9fb', textColor: '#6b7280', fontSize: '13px', align: 'center', padding: '28px 40px',
        },
      },
    ],
  },

  {
    key: 'account-suspended',
    label: 'Account Suspended',
    description: 'Notify client their account has been suspended',
    category: 'account',
    subject: 'Your account has been suspended – {{company.name}}',
    blocks: [
      {
        id: id('hero'), type: 'hero',
        props: {
          title: 'Account Suspended',
          subtitle: 'Action required to restore access to your account.',
          bgColor: '#b91c1c', textColor: '#ffffff',
          buttonLabel: 'Contact Support', buttonUrl: '{{portal.url}}/support',
          buttonBgColor: '#ffffff', buttonTextColor: '#b91c1c',
          padding: '48px 40px', align: 'center',
        },
      },
      {
        id: id('heading'), type: 'heading',
        props: { content: 'Hi {{client.name}},', fontSize: '22px', align: 'left', color: '#111827', padding: '32px 40px 0' },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'We regret to inform you that your account with {{company.name}} has been suspended.',
          fontSize: '15px', align: 'left', color: '#4b5563', padding: '12px 40px 4px',
        },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'Reason: {{suspension.reason}}\nSuspended on: {{suspension.date}}',
          fontSize: '15px', align: 'left', color: '#374151', padding: '4px 40px 16px',
        },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'Please contact our support team to resolve this issue and restore access to your services.',
          fontSize: '15px', align: 'left', color: '#4b5563', padding: '0 40px 24px',
        },
      },
      {
        id: id('button'), type: 'button',
        props: {
          label: 'Open Support Ticket', url: '{{portal.url}}/support', align: 'left',
          bgColor: '#b91c1c', textColor: '#ffffff', padding: '13px 28px',
          borderRadius: '6px', fontSize: '15px', blockPadding: '4px 40px 32px',
        },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px' } },
      {
        id: id('footer'), type: 'footer',
        props: {
          text: '© {{company.name}} · All rights reserved.',
          subtext: 'Need help? Email us at {{company.email}}',
          bgColor: '#f8f9fb', textColor: '#6b7280', fontSize: '13px', align: 'center', padding: '28px 40px',
        },
      },
    ],
  },

  // ── Security ──────────────────────────────────────────────────────────────────
  {
    key: 'password-reset',
    label: 'Password Reset',
    description: 'Sent when a user requests a password reset',
    category: 'security',
    subject: 'Password Reset Request – {{company.name}}',
    blocks: [
      {
        id: id('heading'), type: 'heading',
        props: { content: '{{company.name}}', fontSize: '22px', align: 'center', color: '#4f46e5', padding: '32px 40px 4px' },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px 28px' } },
      {
        id: id('heading'), type: 'heading',
        props: { content: 'Password Reset Request', fontSize: '24px', align: 'center', color: '#111827', padding: '0 40px 12px' },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'Hi {{client.name}},\n\nWe received a request to reset the password for your account. Click the button below — this link expires in 15 minutes.',
          fontSize: '15px', align: 'center', color: '#4b5563', padding: '0 40px 24px',
        },
      },
      {
        id: id('button'), type: 'button',
        props: {
          label: 'Reset My Password', url: '{{reset.url}}', align: 'center',
          bgColor: '#dc2626', textColor: '#ffffff', padding: '13px 32px',
          borderRadius: '6px', fontSize: '15px', blockPadding: '4px 40px 24px',
        },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: '⚠️ If you did not request a password reset, please ignore this email. Your password will remain unchanged.',
          fontSize: '13px', align: 'center', color: '#6b7280', padding: '4px 40px 32px',
        },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px' } },
      {
        id: id('footer'), type: 'footer',
        props: {
          text: '© {{company.name}} Security Team',
          subtext: 'This is an automated security email. Do not reply.',
          bgColor: '#f8f9fb', textColor: '#6b7280', fontSize: '13px', align: 'center', padding: '28px 40px',
        },
      },
    ],
  },

  {
    key: 'security-alert',
    label: 'Security Alert',
    description: 'New login or suspicious activity detected',
    category: 'security',
    subject: 'Security Alert: New login to your {{company.name}} account',
    blocks: [
      {
        id: id('heading'), type: 'heading',
        props: { content: '{{company.name}}', fontSize: '22px', align: 'left', color: '#4f46e5', padding: '32px 40px 4px' },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px 24px' } },
      {
        id: id('heading'), type: 'heading',
        props: { content: '🔐 New Sign-in Detected', fontSize: '24px', align: 'left', color: '#111827', padding: '0 40px 12px' },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'Hi {{client.name}},\n\nWe noticed a new sign-in to your account. If this was you, no action is needed. If you did not sign in, please secure your account immediately.',
          fontSize: '15px', align: 'left', color: '#4b5563', padding: '0 40px 20px',
        },
      },
      {
        id: id('columns2'), type: 'columns2',
        props: {
          gap: '16px', padding: '0 40px 20px',
          columns: [
            { content: '📍 Location\n{{login.location}}', color: '#374151', fontSize: '14px' },
            { content: '🕐 Date & Time\n{{login.date}} at {{login.time}}', color: '#374151', fontSize: '14px' },
          ],
        },
      },
      {
        id: id('columns2'), type: 'columns2',
        props: {
          gap: '16px', padding: '0 40px 24px',
          columns: [
            { content: '💻 Device\n{{login.device}}', color: '#374151', fontSize: '14px' },
            { content: '🌐 IP Address\n{{login.ip}}', color: '#374151', fontSize: '14px' },
          ],
        },
      },
      {
        id: id('button'), type: 'button',
        props: {
          label: 'Secure My Account', url: '{{portal.url}}/profile', align: 'left',
          bgColor: '#dc2626', textColor: '#ffffff', padding: '13px 28px',
          borderRadius: '6px', fontSize: '15px', blockPadding: '4px 40px 32px',
        },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px' } },
      {
        id: id('footer'), type: 'footer',
        props: {
          text: '© {{company.name}} Security Team',
          subtext: 'This is an automated security alert. Do not reply to this email.',
          bgColor: '#fef2f2', textColor: '#6b7280', fontSize: '13px', align: 'center', padding: '28px 40px',
        },
      },
    ],
  },

  // ── Billing ───────────────────────────────────────────────────────────────────
  {
    key: 'invoice',
    label: 'Invoice Created',
    description: 'Sent when a new invoice is generated',
    category: 'billing',
    subject: 'Invoice #{{invoice.id}} from {{company.name}}',
    blocks: [
      {
        id: id('heading'), type: 'heading',
        props: { content: '{{company.name}}', fontSize: '22px', align: 'left', color: '#4f46e5', padding: '32px 40px 4px' },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px 24px' } },
      {
        id: id('heading'), type: 'heading',
        props: { content: 'Invoice #{{invoice.id}}', fontSize: '28px', align: 'left', color: '#111827', padding: '0 40px 4px' },
      },
      {
        id: id('text'), type: 'text',
        props: { content: 'Date: {{invoice.date}} · Due: {{invoice.due_date}}', fontSize: '14px', align: 'left', color: '#6b7280', padding: '0 40px 20px' },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'Hi {{client.name}},\n\nA new invoice has been generated for your account. Please review and make payment before the due date to avoid service interruption.',
          fontSize: '15px', align: 'left', color: '#374151', padding: '0 40px 20px',
        },
      },
      {
        id: id('columns2'), type: 'columns2',
        props: {
          gap: '16px', padding: '0 40px 8px',
          columns: [
            { content: 'Amount Due\n{{invoice.total}}', color: '#111827', fontSize: '15px' },
            { content: 'Due Date\n{{invoice.due_date}}', color: '#111827', fontSize: '15px' },
          ],
        },
      },
      {
        id: id('button'), type: 'button',
        props: {
          label: 'View & Pay Invoice', url: '{{portal.url}}', align: 'left',
          bgColor: '#4f46e5', textColor: '#ffffff', padding: '13px 28px',
          borderRadius: '6px', fontSize: '15px', blockPadding: '20px 40px 32px',
        },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px' } },
      {
        id: id('footer'), type: 'footer',
        props: {
          text: '© {{company.name}} · All rights reserved.',
          subtext: 'Questions? Contact {{company.email}}',
          bgColor: '#f8f9fb', textColor: '#6b7280', fontSize: '13px', align: 'center', padding: '28px 40px',
        },
      },
    ],
  },

  {
    key: 'payment-received',
    label: 'Payment Received',
    description: 'Receipt confirming a successful payment',
    category: 'billing',
    subject: 'Payment Received – Thank you, {{client.name}}!',
    blocks: [
      {
        id: id('hero'), type: 'hero',
        props: {
          title: '✅ Payment Received',
          subtitle: 'Thank you! Your payment has been successfully processed.',
          bgColor: '#059669', textColor: '#ffffff',
          buttonLabel: 'View Receipt', buttonUrl: '{{portal.url}}/billing',
          buttonBgColor: '#ffffff', buttonTextColor: '#059669',
          padding: '48px 40px', align: 'center',
        },
      },
      {
        id: id('heading'), type: 'heading',
        props: { content: 'Hi {{client.name}},', fontSize: '22px', align: 'left', color: '#111827', padding: '32px 40px 0' },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'We have received your payment. Here is a summary of your transaction:',
          fontSize: '15px', align: 'left', color: '#4b5563', padding: '12px 40px 20px',
        },
      },
      {
        id: id('columns2'), type: 'columns2',
        props: {
          gap: '16px', padding: '0 40px 8px',
          columns: [
            { content: 'Amount Paid\n{{payment.amount}}', color: '#111827', fontSize: '15px' },
            { content: 'Transaction ID\n{{payment.transaction_id}}', color: '#111827', fontSize: '15px' },
          ],
        },
      },
      {
        id: id('columns2'), type: 'columns2',
        props: {
          gap: '16px', padding: '0 40px 24px',
          columns: [
            { content: 'Payment Date\n{{payment.date}}', color: '#374151', fontSize: '14px' },
            { content: 'Payment Method\n{{payment.method}}', color: '#374151', fontSize: '14px' },
          ],
        },
      },
      {
        id: id('button'), type: 'button',
        props: {
          label: 'Download Receipt', url: '{{portal.url}}/billing', align: 'left',
          bgColor: '#059669', textColor: '#ffffff', padding: '13px 28px',
          borderRadius: '6px', fontSize: '15px', blockPadding: '4px 40px 32px',
        },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px' } },
      {
        id: id('footer'), type: 'footer',
        props: {
          text: '© {{company.name}} · All rights reserved.',
          subtext: 'Keep this email as your payment receipt. Questions? Contact {{company.email}}',
          bgColor: '#f0fdf4', textColor: '#6b7280', fontSize: '13px', align: 'center', padding: '28px 40px',
        },
      },
    ],
  },

  {
    key: 'payment-overdue',
    label: 'Payment Overdue',
    description: 'Reminder for an overdue or unpaid invoice',
    category: 'billing',
    subject: 'Action Required: Payment Overdue – Invoice #{{invoice.id}}',
    blocks: [
      {
        id: id('hero'), type: 'hero',
        props: {
          title: '⚠️ Payment Overdue',
          subtitle: 'Please settle your outstanding balance to avoid service interruption.',
          bgColor: '#d97706', textColor: '#ffffff',
          buttonLabel: 'Pay Now', buttonUrl: '{{portal.url}}/billing',
          buttonBgColor: '#ffffff', buttonTextColor: '#d97706',
          padding: '48px 40px', align: 'center',
        },
      },
      {
        id: id('heading'), type: 'heading',
        props: { content: 'Hi {{client.name}},', fontSize: '22px', align: 'left', color: '#111827', padding: '32px 40px 0' },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'This is a reminder that Invoice #{{invoice.id}} is now overdue. Please make payment as soon as possible to keep your services running.',
          fontSize: '15px', align: 'left', color: '#4b5563', padding: '12px 40px 20px',
        },
      },
      {
        id: id('columns2'), type: 'columns2',
        props: {
          gap: '16px', padding: '0 40px 8px',
          columns: [
            { content: 'Amount Due\n{{invoice.total}}', color: '#b91c1c', fontSize: '16px' },
            { content: 'Days Overdue\n{{invoice.days_overdue}} days', color: '#b91c1c', fontSize: '16px' },
          ],
        },
      },
      {
        id: id('spacer'), type: 'spacer', props: { height: '16px' },
      },
      {
        id: id('button'), type: 'button',
        props: {
          label: 'Pay Overdue Invoice', url: '{{portal.url}}/billing', align: 'left',
          bgColor: '#d97706', textColor: '#ffffff', padding: '13px 28px',
          borderRadius: '6px', fontSize: '15px', blockPadding: '4px 40px 32px',
        },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'If you believe this is an error or need to discuss a payment plan, please contact our billing team immediately.',
          fontSize: '13px', align: 'left', color: '#6b7280', padding: '0 40px 24px',
        },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px' } },
      {
        id: id('footer'), type: 'footer',
        props: {
          text: '© {{company.name}} · Billing Department',
          subtext: 'Contact us at {{company.email}} for billing inquiries.',
          bgColor: '#fffbeb', textColor: '#6b7280', fontSize: '13px', align: 'center', padding: '28px 40px',
        },
      },
    ],
  },

  {
    key: 'refund-issued',
    label: 'Refund Issued',
    description: 'Confirmation that a refund has been processed',
    category: 'billing',
    subject: 'Your Refund Has Been Processed – {{company.name}}',
    blocks: [
      {
        id: id('heading'), type: 'heading',
        props: { content: '{{company.name}}', fontSize: '22px', align: 'left', color: '#4f46e5', padding: '32px 40px 4px' },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px 24px' } },
      {
        id: id('heading'), type: 'heading',
        props: { content: '💸 Refund Processed', fontSize: '26px', align: 'left', color: '#111827', padding: '0 40px 12px' },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'Hi {{client.name}},\n\nYour refund request has been approved and processed. Please allow 3–5 business days for the funds to appear in your original payment method.',
          fontSize: '15px', align: 'left', color: '#4b5563', padding: '0 40px 20px',
        },
      },
      {
        id: id('columns2'), type: 'columns2',
        props: {
          gap: '16px', padding: '0 40px 8px',
          columns: [
            { content: 'Refund Amount\n{{refund.amount}}', color: '#111827', fontSize: '15px' },
            { content: 'Reference\n{{refund.reference}}', color: '#111827', fontSize: '15px' },
          ],
        },
      },
      {
        id: id('columns2'), type: 'columns2',
        props: {
          gap: '16px', padding: '0 40px 24px',
          columns: [
            { content: 'Refund Date\n{{refund.date}}', color: '#374151', fontSize: '14px' },
            { content: 'Original Invoice\n#{{invoice.id}}', color: '#374151', fontSize: '14px' },
          ],
        },
      },
      {
        id: id('button'), type: 'button',
        props: {
          label: 'View Billing History', url: '{{portal.url}}/billing', align: 'left',
          bgColor: '#4f46e5', textColor: '#ffffff', padding: '13px 28px',
          borderRadius: '6px', fontSize: '15px', blockPadding: '4px 40px 32px',
        },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px' } },
      {
        id: id('footer'), type: 'footer',
        props: {
          text: '© {{company.name}} · All rights reserved.',
          subtext: 'Questions about your refund? Contact {{company.email}}',
          bgColor: '#f8f9fb', textColor: '#6b7280', fontSize: '13px', align: 'center', padding: '28px 40px',
        },
      },
    ],
  },

  // ── Orders ────────────────────────────────────────────────────────────────────
  {
    key: 'order-confirmation',
    label: 'Order Confirmation',
    description: 'Sent when a new order is placed',
    category: 'orders',
    subject: 'Order Confirmed – #{{order.id}} | {{company.name}}',
    blocks: [
      {
        id: id('hero'), type: 'hero',
        props: {
          title: 'Order Confirmed! 🎉',
          subtitle: 'Thank you for your order. We are processing it now.',
          bgColor: '#7c3aed', textColor: '#ffffff',
          buttonLabel: 'View Order', buttonUrl: '{{portal.url}}/orders',
          buttonBgColor: '#ffffff', buttonTextColor: '#7c3aed',
          padding: '48px 40px', align: 'center',
        },
      },
      {
        id: id('heading'), type: 'heading',
        props: { content: 'Hi {{client.name}},', fontSize: '22px', align: 'left', color: '#111827', padding: '32px 40px 0' },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'Your order has been received and is being processed. You will receive a follow-up email once it is activated.',
          fontSize: '15px', align: 'left', color: '#4b5563', padding: '12px 40px 20px',
        },
      },
      {
        id: id('columns2'), type: 'columns2',
        props: {
          gap: '16px', padding: '0 40px 8px',
          columns: [
            { content: 'Order Number\n#{{order.id}}', color: '#111827', fontSize: '15px' },
            { content: 'Order Date\n{{order.date}}', color: '#111827', fontSize: '15px' },
          ],
        },
      },
      {
        id: id('columns2'), type: 'columns2',
        props: {
          gap: '16px', padding: '0 40px 24px',
          columns: [
            { content: 'Product\n{{order.product}}', color: '#374151', fontSize: '14px' },
            { content: 'Total\n{{order.total}}', color: '#374151', fontSize: '14px' },
          ],
        },
      },
      {
        id: id('button'), type: 'button',
        props: {
          label: 'Track My Order', url: '{{portal.url}}/orders', align: 'left',
          bgColor: '#7c3aed', textColor: '#ffffff', padding: '13px 28px',
          borderRadius: '6px', fontSize: '15px', blockPadding: '4px 40px 32px',
        },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px' } },
      {
        id: id('footer'), type: 'footer',
        props: {
          text: '© {{company.name}} · All rights reserved.',
          subtext: 'Need help with your order? Contact {{company.email}}',
          bgColor: '#faf5ff', textColor: '#6b7280', fontSize: '13px', align: 'center', padding: '28px 40px',
        },
      },
    ],
  },

  // ── Services ──────────────────────────────────────────────────────────────────
  {
    key: 'service-activated',
    label: 'Service Activated',
    description: 'Confirm a service has been set up and is live',
    category: 'services',
    subject: '🚀 Your service is live – {{service.name}}',
    blocks: [
      {
        id: id('hero'), type: 'hero',
        props: {
          title: '🚀 Your Service is Live!',
          subtitle: '{{service.name}} has been activated and is ready to use.',
          bgColor: '#0284c7', textColor: '#ffffff',
          buttonLabel: 'Manage Service', buttonUrl: '{{portal.url}}/services',
          buttonBgColor: '#ffffff', buttonTextColor: '#0284c7',
          padding: '48px 40px', align: 'center',
        },
      },
      {
        id: id('heading'), type: 'heading',
        props: { content: 'Hi {{client.name}},', fontSize: '22px', align: 'left', color: '#111827', padding: '32px 40px 0' },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'Great news! Your service has been provisioned and is now fully active. Here are your service details:',
          fontSize: '15px', align: 'left', color: '#4b5563', padding: '12px 40px 20px',
        },
      },
      {
        id: id('columns2'), type: 'columns2',
        props: {
          gap: '16px', padding: '0 40px 8px',
          columns: [
            { content: 'Service\n{{service.name}}', color: '#111827', fontSize: '15px' },
            { content: 'Plan\n{{service.plan}}', color: '#111827', fontSize: '15px' },
          ],
        },
      },
      {
        id: id('columns2'), type: 'columns2',
        props: {
          gap: '16px', padding: '0 40px 8px',
          columns: [
            { content: 'Activation Date\n{{service.activation_date}}', color: '#374151', fontSize: '14px' },
            { content: 'Next Renewal\n{{service.next_due_date}}', color: '#374151', fontSize: '14px' },
          ],
        },
      },
      {
        id: id('columns2'), type: 'columns2',
        props: {
          gap: '16px', padding: '0 40px 24px',
          columns: [
            { content: 'Username\n{{service.username}}', color: '#374151', fontSize: '14px' },
            { content: 'Server\n{{service.server}}', color: '#374151', fontSize: '14px' },
          ],
        },
      },
      {
        id: id('button'), type: 'button',
        props: {
          label: 'Manage My Service', url: '{{portal.url}}/services', align: 'left',
          bgColor: '#0284c7', textColor: '#ffffff', padding: '13px 28px',
          borderRadius: '6px', fontSize: '15px', blockPadding: '4px 40px 32px',
        },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px' } },
      {
        id: id('footer'), type: 'footer',
        props: {
          text: '© {{company.name}} · All rights reserved.',
          subtext: 'Need help? Visit our knowledge base or contact {{company.email}}',
          bgColor: '#f0f9ff', textColor: '#6b7280', fontSize: '13px', align: 'center', padding: '28px 40px',
        },
      },
    ],
  },

  {
    key: 'service-suspended',
    label: 'Service Suspended',
    description: 'Notify client a service has been suspended',
    category: 'services',
    subject: 'Service Suspended: {{service.name}} – Action Required',
    blocks: [
      {
        id: id('hero'), type: 'hero',
        props: {
          title: 'Service Suspended',
          subtitle: '{{service.name}} has been suspended due to non-payment.',
          bgColor: '#dc2626', textColor: '#ffffff',
          buttonLabel: 'Reactivate Service', buttonUrl: '{{portal.url}}/billing',
          buttonBgColor: '#ffffff', buttonTextColor: '#dc2626',
          padding: '48px 40px', align: 'center',
        },
      },
      {
        id: id('heading'), type: 'heading',
        props: { content: 'Hi {{client.name}},', fontSize: '22px', align: 'left', color: '#111827', padding: '32px 40px 0' },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'Unfortunately, your service has been suspended. To reactivate it, please settle your outstanding balance as soon as possible.',
          fontSize: '15px', align: 'left', color: '#4b5563', padding: '12px 40px 20px',
        },
      },
      {
        id: id('columns2'), type: 'columns2',
        props: {
          gap: '16px', padding: '0 40px 24px',
          columns: [
            { content: 'Service\n{{service.name}}', color: '#111827', fontSize: '15px' },
            { content: 'Suspended On\n{{service.suspension_date}}', color: '#b91c1c', fontSize: '15px' },
          ],
        },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: '⚠️ Your data will be held for {{service.termination_days}} days. After that, it may be permanently deleted.',
          fontSize: '14px', align: 'left', color: '#b91c1c', padding: '0 40px 20px',
        },
      },
      {
        id: id('button'), type: 'button',
        props: {
          label: 'Pay & Reactivate', url: '{{portal.url}}/billing', align: 'left',
          bgColor: '#dc2626', textColor: '#ffffff', padding: '13px 28px',
          borderRadius: '6px', fontSize: '15px', blockPadding: '4px 40px 32px',
        },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px' } },
      {
        id: id('footer'), type: 'footer',
        props: {
          text: '© {{company.name}} · All rights reserved.',
          subtext: 'Need assistance? Contact our billing team at {{company.email}}',
          bgColor: '#fef2f2', textColor: '#6b7280', fontSize: '13px', align: 'center', padding: '28px 40px',
        },
      },
    ],
  },

  // ── Support ───────────────────────────────────────────────────────────────────
  {
    key: 'ticket-created',
    label: 'Ticket Created',
    description: 'Confirmation that a support ticket was opened',
    category: 'support',
    subject: 'Support Ticket #{{ticket.id}} Received – {{company.name}}',
    blocks: [
      {
        id: id('heading'), type: 'heading',
        props: { content: '{{company.name}} Support', fontSize: '22px', align: 'left', color: '#4f46e5', padding: '32px 40px 4px' },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px 24px' } },
      {
        id: id('heading'), type: 'heading',
        props: { content: '🎫 Ticket #{{ticket.id}} Received', fontSize: '24px', align: 'left', color: '#111827', padding: '0 40px 12px' },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'Hi {{client.name}},\n\nWe have received your support request and a member of our team will be in touch shortly. Your ticket details are below:',
          fontSize: '15px', align: 'left', color: '#4b5563', padding: '0 40px 20px',
        },
      },
      {
        id: id('columns2'), type: 'columns2',
        props: {
          gap: '16px', padding: '0 40px 8px',
          columns: [
            { content: 'Ticket ID\n#{{ticket.id}}', color: '#111827', fontSize: '15px' },
            { content: 'Priority\n{{ticket.priority}}', color: '#111827', fontSize: '15px' },
          ],
        },
      },
      {
        id: id('columns2'), type: 'columns2',
        props: {
          gap: '16px', padding: '0 40px 24px',
          columns: [
            { content: 'Department\n{{ticket.department}}', color: '#374151', fontSize: '14px' },
            { content: 'Submitted\n{{ticket.created_at}}', color: '#374151', fontSize: '14px' },
          ],
        },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'Subject: {{ticket.subject}}',
          fontSize: '14px', align: 'left', color: '#374151', padding: '0 40px 20px',
        },
      },
      {
        id: id('button'), type: 'button',
        props: {
          label: 'View My Ticket', url: '{{portal.url}}/support/{{ticket.id}}', align: 'left',
          bgColor: '#4f46e5', textColor: '#ffffff', padding: '13px 28px',
          borderRadius: '6px', fontSize: '15px', blockPadding: '4px 40px 32px',
        },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px' } },
      {
        id: id('footer'), type: 'footer',
        props: {
          text: '© {{company.name}} · Support Team',
          subtext: 'Average response time: {{company.support_hours}}. Reply to this email to update your ticket.',
          bgColor: '#f8f9fb', textColor: '#6b7280', fontSize: '13px', align: 'center', padding: '28px 40px',
        },
      },
    ],
  },

  {
    key: 'ticket-reply',
    label: 'Ticket Reply',
    description: 'Alert client that a staff member replied to their ticket',
    category: 'support',
    subject: 'New Reply on Ticket #{{ticket.id}} – {{company.name}}',
    blocks: [
      {
        id: id('heading'), type: 'heading',
        props: { content: '{{company.name}} Support', fontSize: '22px', align: 'left', color: '#4f46e5', padding: '32px 40px 4px' },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px 24px' } },
      {
        id: id('heading'), type: 'heading',
        props: { content: 'New Reply on Ticket #{{ticket.id}}', fontSize: '22px', align: 'left', color: '#111827', padding: '0 40px 8px' },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'Hi {{client.name}},\n\n{{ticket.staff_name}} from our support team has replied to your ticket.',
          fontSize: '15px', align: 'left', color: '#4b5563', padding: '0 40px 16px',
        },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: '"{{ticket.reply_preview}}"',
          fontSize: '15px', align: 'left', color: '#374151', padding: '0 40px 24px',
        },
      },
      {
        id: id('button'), type: 'button',
        props: {
          label: 'View Full Reply', url: '{{portal.url}}/support/{{ticket.id}}', align: 'left',
          bgColor: '#4f46e5', textColor: '#ffffff', padding: '13px 28px',
          borderRadius: '6px', fontSize: '15px', blockPadding: '4px 40px 32px',
        },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px' } },
      {
        id: id('footer'), type: 'footer',
        props: {
          text: '© {{company.name}} · Support Team',
          subtext: 'You can reply directly to this email or log in to your portal to respond.',
          bgColor: '#f8f9fb', textColor: '#6b7280', fontSize: '13px', align: 'center', padding: '28px 40px',
        },
      },
    ],
  },

  // ── Marketing ─────────────────────────────────────────────────────────────────
  {
    key: 'newsletter',
    label: 'Newsletter',
    description: 'Monthly newsletter / promotional email',
    category: 'marketing',
    subject: '{{company.name}} – {{newsletter.month}} Updates & News',
    blocks: [
      {
        id: id('hero'), type: 'hero',
        props: {
          title: '{{newsletter.month}} Newsletter',
          subtitle: 'Latest updates, tips, and offers from {{company.name}}.',
          bgColor: '#1e293b', textColor: '#f8fafc',
          buttonLabel: 'Read More', buttonUrl: '{{company.website}}',
          buttonBgColor: '#6366f1', buttonTextColor: '#ffffff',
          padding: '52px 40px', align: 'center',
        },
      },
      { id: id('spacer'), type: 'spacer', props: { height: '24px' } },
      {
        id: id('heading'), type: 'heading',
        props: { content: "What's New", fontSize: '22px', align: 'left', color: '#111827', padding: '0 40px 8px' },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: 'Here is a summary of what has been happening at {{company.name}} this month. We have been working hard to bring you new features, better performance, and great deals.',
          fontSize: '15px', align: 'left', color: '#4b5563', padding: '0 40px 24px',
        },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px 24px' } },
      {
        id: id('heading'), type: 'heading',
        props: { content: '🔥 Featured Offer', fontSize: '20px', align: 'left', color: '#111827', padding: '0 40px 8px' },
      },
      {
        id: id('text'), type: 'text',
        props: {
          content: '{{newsletter.offer_description}}',
          fontSize: '15px', align: 'left', color: '#374151', padding: '0 40px 16px',
        },
      },
      {
        id: id('button'), type: 'button',
        props: {
          label: 'Claim Offer', url: '{{newsletter.offer_url}}', align: 'left',
          bgColor: '#6366f1', textColor: '#ffffff', padding: '13px 28px',
          borderRadius: '6px', fontSize: '15px', blockPadding: '4px 40px 32px',
        },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px 24px' } },
      {
        id: id('heading'), type: 'heading',
        props: { content: '📣 Quick Updates', fontSize: '20px', align: 'left', color: '#111827', padding: '0 40px 8px' },
      },
      {
        id: id('columns3'), type: 'columns3',
        props: {
          gap: '12px', padding: '0 40px 28px',
          columns: [
            { content: '🚀 Performance\nWe upgraded our infrastructure for faster load times.', color: '#374151', fontSize: '13px' },
            { content: '🛡️ Security\nNew two-factor authentication is now available for all accounts.', color: '#374151', fontSize: '13px' },
            { content: '💬 Support\nLive chat support is now available 24/7.', color: '#374151', fontSize: '13px' },
          ],
        },
      },
      { id: id('divider'), type: 'divider', props: { color: '#e5e7eb', thickness: '1px', margin: '0 40px' } },
      {
        id: id('footer'), type: 'footer',
        props: {
          text: '© {{company.name}} · All rights reserved.',
          subtext: 'You are receiving this email because you subscribed to our newsletter. Unsubscribe.',
          bgColor: '#f8f9fb', textColor: '#6b7280', fontSize: '13px', align: 'center', padding: '28px 40px',
        },
      },
    ],
  },
];
