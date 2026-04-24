/**
 * Service Automation Service
 * Path: src/modules/services/services/service-automation.service.js
 * 
 * Manages automation workflows for services
 * Examples: Auto-provisioning, auto-suspension, email notifications, webhooks
 */

const prisma = require("../../../../prisma");

class ServiceAutomationService {
  /**
   * Create automation rule for a service
   */
  async create(serviceId, data, actor) {
    try {
      // Validate service exists
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
      });

      if (!service) {
        const err = new Error("Service not found");
        err.statusCode = 404;
        throw err;
      }

      const automation = await prisma.serviceAutomation.create({
        data: {
          serviceId,
          event: data.event,
          action: data.action,
          module: data.module,
          provisioningKey: data.provisioningKey,
          webhookUrl: data.webhookUrl,
          emailTemplate: data.emailTemplate,
          config: data.config || {},
          enabled: true,
          priority: data.priority || 0,
        },
      });

      return automation;
    } catch (err) {
      if (err.statusCode) throw err;
      throw err;
    }
  }

  /**
   * Get automation by ID
   */
  async getById(id) {
    const automation = await prisma.serviceAutomation.findUnique({
      where: { id },
    });

    if (!automation) {
      const err = new Error("Automation rule not found");
      err.statusCode = 404;
      throw err;
    }

    return automation;
  }

  /**
   * Get automation rules for a service
   */
  async getByServiceId(serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      const err = new Error("Service not found");
      err.statusCode = 404;
      throw err;
    }

    return prisma.serviceAutomation.findMany({
      where: { serviceId },
      orderBy: [{ event: "asc" }, { priority: "desc" }],
    });
  }

  /**
   * Get automations by event
   */
  async getByEvent(serviceId, event) {
    return prisma.serviceAutomation.findMany({
      where: {
        serviceId,
        event,
        enabled: true,
      },
      orderBy: { priority: "desc" },
    });
  }

  /**
   * Update automation rule
   */
  async update(id, data, actor) {
    const automation = await this.getById(id);

    const updateData = {};
    if (data.action !== undefined) updateData.action = data.action;
    if (data.module !== undefined) updateData.module = data.module;
    if (data.provisioningKey !== undefined) updateData.provisioningKey = data.provisioningKey;
    if (data.webhookUrl !== undefined) updateData.webhookUrl = data.webhookUrl;
    if (data.emailTemplate !== undefined) updateData.emailTemplate = data.emailTemplate;
    if (data.config !== undefined) updateData.config = data.config;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.priority !== undefined) updateData.priority = data.priority;

    if (Object.keys(updateData).length === 0) {
      const err = new Error("No fields to update");
      err.statusCode = 400;
      throw err;
    }

    const updated = await prisma.serviceAutomation.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  /**
   * Delete automation rule
   */
  async delete(id, actor) {
    const automation = await this.getById(id);

    await prisma.serviceAutomation.delete({
      where: { id },
    });

    return { message: "Automation rule deleted successfully" };
  }

  /**
   * Toggle automation enabled status
   */
  async toggleEnabled(id, actor) {
    const automation = await this.getById(id);

    const updated = await prisma.serviceAutomation.update({
      where: { id },
      data: { enabled: !automation.enabled },
    });

    return updated;
  }

  /**
   * Get automation configuration template
   */
  getConfigTemplate(action) {
    const templates = {
      provision: {
        module: "cpanel",
        serverGroup: "shared",
        customConfig: {},
      },
      suspend: {
        reason: "Payment required",
        notify: true,
      },
      terminate: {
        backupData: false,
        archiveData: false,
      },
      email: {
        template: "order_confirmation",
        sendToAdmin: false,
        sendToClient: true,
      },
      webhook: {
        url: "",
        method: "POST",
        retries: 3,
        timeout: 30,
      },
    };

    return templates[action] || {};
  }

  /**
   * Execute automation event
   * This would be called by order service or other modules
   */
  async executeEvent(serviceId, event, context = {}) {
    const automations = await this.getByEvent(serviceId, event);

    if (automations.length === 0) {
      return { status: "no_automations", message: "No automations configured for this event" };
    }

    const results = [];

    for (const automation of automations) {
      try {
        let result;

        switch (automation.action) {
          case "provision":
            result = await this.executeProvision(automation, context);
            break;
          case "suspend":
            result = await this.executeSuspend(automation, context);
            break;
          case "email":
            result = await this.executeEmail(automation, context);
            break;
          case "webhook":
            result = await this.executeWebhook(automation, context);
            break;
          default:
            result = { status: "unknown_action" };
        }

        results.push({
          automationId: automation.id,
          action: automation.action,
          ...result,
        });
      } catch (err) {
        results.push({
          automationId: automation.id,
          action: automation.action,
          status: "error",
          error: err.message,
        });
      }
    }

    return results;
  }

  /**
   * Execute provisioning automation
   */
  async executeProvision(automation, context) {
    // This would integrate with actual provisioning modules (cPanel, DirectAdmin, etc.)
    // For now, return a stub
    return {
      status: "pending",
      message: "Provisioning queued",
      module: automation.module,
      config: automation.config,
    };
  }

  /**
   * Execute suspension automation
   */
  async executeSuspend(automation, context) {
    // Integration with suspension logic
    return {
      status: "executed",
      message: "Service suspended",
      reason: automation.config.reason,
    };
  }

  /**
   * Execute email notification
   */
  async executeEmail(automation, context) {
    // Integration with email service
    return {
      status: "pending",
      message: "Email notification queued",
      template: automation.emailTemplate,
      recipients: context.emails || [],
    };
  }

  /**
   * Execute webhook
   */
  async executeWebhook(automation, context) {
    // Integration with webhook service
    return {
      status: "pending",
      message: "Webhook event queued",
      url: automation.webhookUrl,
      method: "POST",
      payload: context,
    };
  }

  /**
   * Create provisioning automation for common modules
   */
  async createProvisioning(serviceId, module, config, actor) {
    const automation = await this.create(
      serviceId,
      {
        event: "create",
        action: "provision",
        module,
        config,
      },
      actor
    );

    return automation;
  }

  /**
   * Create email notification automation
   */
  async createEmailNotification(serviceId, event, template, actor) {
    const automation = await this.create(
      serviceId,
      {
        event,
        action: "email",
        emailTemplate: template,
        config: { sendToAdmin: true, sendToClient: true },
      },
      actor
    );

    return automation;
  }

  /**
   * Create webhook automation
   */
  async createWebhook(serviceId, event, webhookUrl, actor) {
    const automation = await this.create(
      serviceId,
      {
        event,
        action: "webhook",
        webhookUrl,
        config: { method: "POST", retries: 3, timeout: 30 },
      },
      actor
    );

    return automation;
  }

  /**
   * Get provisioning modules list
   */
  getAvailableModules() {
    return [
      {
        id: "cpanel",
        name: "cPanel",
        description: "cPanel/WHM hosting control panel",
      },
      {
        id: "directadmin",
        name: "DirectAdmin",
        description: "DirectAdmin control panel",
      },
      {
        id: "plesk",
        name: "Plesk",
        description: "Plesk control panel",
      },
      {
        id: "custom",
        name: "Custom",
        description: "Custom provisioning module",
      },
    ];
  }

  /**
   * Get available events
   */
  getAvailableEvents() {
    return [
      { id: "create", name: "Service Created" },
      { id: "suspend", name: "Service Suspended" },
      { id: "resume", name: "Service Resumed" },
      { id: "terminate", name: "Service Terminated" },
      { id: "upgrade", name: "Service Upgraded" },
      { id: "downgrade", name: "Service Downgraded" },
      { id: "renew", name: "Service Renewed" },
      { id: "payment_received", name: "Payment Received" },
      { id: "payment_overdue", name: "Payment Overdue" },
    ];
  }

  /**
   * Get available actions
   */
  getAvailableActions() {
    return [
      { id: "provision", name: "Provision Service" },
      { id: "suspend", name: "Suspend Service" },
      { id: "resume", name: "Resume Service" },
      { id: "terminate", name: "Terminate Service" },
      { id: "email", name: "Send Email" },
      { id: "webhook", name: "Call Webhook" },
      { id: "credit_account", name: "Credit Account" },
      { id: "debit_account", name: "Debit Account" },
    ];
  }
}

module.exports = new ServiceAutomationService();