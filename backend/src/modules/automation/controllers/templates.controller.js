/**
 * Automation Templates Controller
 * Preset automation templates that users can install with one click
 */

const TEMPLATES = [
  {
    id: 'invoice-overdue-handler',
    name: 'Auto-Suspend Overdue Invoices',
    description: 'Automatically create a support ticket and optionally suspend service for overdue invoices.',
    category: 'billing',
    icon: 'AlertCircle',
    color: 'red',
    trigger: {
      type: 'event',
      eventType: 'invoice.overdue',
    },
    definition: {
      name: 'Auto-Suspend Overdue Invoices',
      version: 1,
      tasks: [
        {
          id: 'check-days-overdue',
          type: 'condition',
          condition: 'input.daysPastDue >= 14',
          onTrue: 'create-ticket',
          onFalse: 'email-client',
        },
        {
          id: 'create-ticket',
          type: 'action',
          actionType: 'support.create_ticket',
          input: {
            clientId: '{{input.clientId}}',
            subject: 'Account Suspension Warning - Invoice {{input.invoiceId}} Overdue 14+ Days',
            message: 'Your account is at risk of suspension due to unpaid invoice. Please remit payment immediately.',
            priority: 'high',
            department: 'Billing',
          },
        },
        {
          id: 'email-client',
          type: 'action',
          actionType: 'client.send_email',
          input: {
            clientId: '{{input.clientId}}',
            subject: 'Payment Reminder - Invoice {{input.invoiceId}}',
            body: 'We have not yet received payment for invoice {{input.invoiceId}} (${amount}). Please remit payment within 3 business days to avoid service suspension.',
          },
        },
      ],
    },
  },

  {
    id: 'new-client-welcome',
    name: 'New Client Onboarding',
    description: 'Send welcome email to new registered clients.',
    category: 'auth',
    icon: 'Mail',
    color: 'green',
    trigger: {
      type: 'event',
      eventType: 'auth.register',
    },
    definition: {
      name: 'New Client Onboarding',
      version: 1,
      tasks: [
        {
          id: 'send-welcome-email',
          type: 'action',
          actionType: 'client.send_email',
          input: {
            clientId: '{{input.userId}}',
            subject: 'Welcome to WHMS!',
            body: 'Hi {{input.name}},\n\nWelcome to WHMS. We\'re excited to have you on board!\n\nNext steps:\n1. Verify your email address\n2. Complete your profile\n3. Browse our service catalog\n4. Create your first order\n\nIf you have any questions, our support team is ready to help.',
          },
        },
        {
          id: 'audit-log',
          type: 'action',
          actionType: 'system.audit_log',
          input: {
            message: 'New client onboarding workflow completed for {{input.email}}',
            level: 'INFO',
            entity: 'User',
            entityId: '{{input.userId}}',
          },
        },
      ],
    },
  },

  {
    id: 'critical-ticket-escalation',
    name: 'High-Priority Ticket Escalation',
    description: 'Alert team via Slack and update status for critical/high-priority tickets.',
    category: 'support',
    icon: 'AlertTriangle',
    color: 'orange',
    trigger: {
      type: 'event',
      eventType: 'ticket.created',
    },
    definition: {
      name: 'High-Priority Ticket Escalation',
      version: 1,
      tasks: [
        {
          id: 'check-priority',
          type: 'condition',
          condition: 'input.priority === "critical" || input.priority === "high"',
          onTrue: 'slack-alert',
          onFalse: null,
        },
        {
          id: 'slack-alert',
          type: 'action',
          actionType: 'notify.slack',
          input: {
            webhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
            text: '⚠️ High-Priority Support Ticket\nSubject: {{input.subject}}\nPriority: {{input.priority}}\nDepartment: {{input.department}}\n\nPlease respond promptly.',
            username: 'WHMS Support',
            iconEmoji: ':warning:',
          },
        },
      ],
    },
  },

  {
    id: 'failed-payment-dunning',
    name: 'Failed Payment Dunning Sequence',
    description: 'After 3 failed payment attempts, suspend service and notify client.',
    category: 'billing',
    icon: 'CreditCard',
    color: 'red',
    trigger: {
      type: 'event',
      eventType: 'payment.failed',
    },
    definition: {
      name: 'Failed Payment Dunning',
      version: 1,
      tasks: [
        {
          id: 'check-attempts',
          type: 'condition',
          condition: 'input.attemptNumber >= 3',
          onTrue: 'suspend-service',
          onFalse: 'send-reminder',
        },
        {
          id: 'suspend-service',
          type: 'action',
          actionType: 'service.suspend',
          input: {
            serviceId: '{{input.serviceId}}',
            reason: 'Service suspended due to 3+ failed payment attempts',
          },
        },
        {
          id: 'notify-suspension',
          type: 'action',
          actionType: 'client.send_email',
          input: {
            clientId: '{{input.clientId}}',
            subject: 'Service Suspension - Payment Required',
            body: 'Your service has been suspended due to multiple failed payment attempts. Please update your payment method or contact support.',
          },
        },
        {
          id: 'send-reminder',
          type: 'action',
          actionType: 'client.send_email',
          input: {
            clientId: '{{input.clientId}}',
            subject: 'Payment Failed - Please Update Payment Method',
            body: 'Your recent payment attempt failed. Please update your payment information to avoid service interruption.',
          },
        },
      ],
    },
  },

  {
    id: 'service-expiry-reminder',
    name: 'Service Expiry Renewal Reminder',
    description: 'Send renewal reminder 7 days before service expires.',
    category: 'services',
    icon: 'Clock',
    color: 'blue',
    trigger: {
      type: 'event',
      eventType: 'service.expiry_warning',
    },
    definition: {
      name: 'Service Expiry Renewal Reminder',
      version: 1,
      tasks: [
        {
          id: 'check-days-remaining',
          type: 'condition',
          condition: 'input.daysRemaining <= 7 && input.daysRemaining > 0',
          onTrue: 'send-renewal-email',
          onFalse: null,
        },
        {
          id: 'send-renewal-email',
          type: 'action',
          actionType: 'client.send_email',
          input: {
            clientId: '{{input.clientId}}',
            subject: 'Your Service Expires in {{input.daysRemaining}} Days',
            body: 'Your service {{input.serviceName}} will expire on {{input.expiresAt}}. Renew now to avoid service interruption.\n\nRenewal instructions: Log in to your portal and click "Renew" on the service details page.',
          },
        },
        {
          id: 'create-renewal-invoice',
          type: 'action',
          actionType: 'billing.create_invoice',
          input: {
            clientId: '{{input.clientId}}',
            amount: '{{input.renewalAmount}}',
            description: 'Service renewal for {{input.serviceName}}',
            dueDate: '{{input.expiresAt}}',
          },
        },
      ],
    },
  },
];

class TemplatesController {
  /**
   * List all available templates
   */
  static async list(req, res) {
    try {
      const templates = TEMPLATES.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        icon: t.icon,
        color: t.color,
        trigger: t.trigger,
      }));

      return res.success(templates);
    } catch (err) {
      console.error('Templates list error:', err.message);
      return res.error(err);
    }
  }

  /**
   * Get single template by ID
   */
  static async get(req, res) {
    try {
      const { templateId } = req.params;
      const template = TEMPLATES.find(t => t.id === templateId);

      if (!template) {
        return res.fail('Template not found', 404, 'template_not_found');
      }

      return res.success(template);
    } catch (err) {
      console.error('Template get error:', err.message);
      return res.error(err);
    }
  }

  /**
   * Install template: create workflow + trigger rule
   * Checks if workflow with same name already exists
   */
  static async install(req, res) {
    try {
      const { templateId } = req.params;
      const prisma = this.prisma;
      const logger = this.logger;

      if (!prisma) {
        return res.status(500).json({ error: 'Database not available' });
      }

      const template = TEMPLATES.find(t => t.id === templateId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Check if workflow with same name already exists
      const existingWorkflow = await prisma.automationWorkflow?.findFirst?.({
        where: {
          name: template.definition.name,
          deletedAt: null,
        },
      });

      if (existingWorkflow) {
        return res.fail(
          `Workflow "${template.definition.name}" already exists`,
          409,
          'workflow_already_exists',
          { existingWorkflowId: existingWorkflow.id }
        );
      }

      // Create workflow
      const slug = template.id.replace(/[^a-z0-9-]/g, '-');
      const workflow = await prisma.automationWorkflow.create({
        data: {
          name: template.definition.name,
          slug,
          description: template.description,
          definition: template.definition,
          enabled: true,
          version: 1,
        },
      });

      // Create trigger rule
      const triggerRule = await prisma.workflowTriggerRule.create({
        data: {
          workflowId: workflow.id,
          eventType: template.trigger.eventType,
          enabled: true,
        },
      });

      if (logger) {
        logger.info(`Installed template: ${template.name}`, {
          workflowId: workflow.id,
          triggerId: triggerRule.id,
        });
      }

      const responseData = {
        workflow: {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          enabled: workflow.enabled,
          trigger: {
            id: triggerRule.id,
            eventType: triggerRule.eventType,
          },
        },
      };

      return res.success(responseData, {}, 201);
    } catch (err) {
      console.error('Template install error:', err.message);
      return res.error(err, 500);
    }
  }
}

module.exports = TemplatesController;
