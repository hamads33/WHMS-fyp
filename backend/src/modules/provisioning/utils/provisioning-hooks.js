/**
 * Provisioning Integration Hooks
 * Path: src/modules/provisioning/utils/provisioning-hooks.js
 *
 * These hooks are called from Orders and Billing modules
 * to trigger provisioning actions on lifecycle events
 */

const provisioningService = require("../services/provisioning.service");
const prisma = require("../../../../prisma");
const emailTriggers = require("../../email/triggers/email.triggers");

async function isAutoProvisioningEnabled() {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: "provisioning.auto" } });
    // Default ON if setting doesn't exist yet
    if (!setting) return true;
    return setting.value === true || setting.value === "true";
  } catch {
    return true; // Fail open — don't block provisioning on DB error
  }
}

/**
 * HOOK 1: Order Activation Hook
 * Called from: order.service.activate(orderId)
 *
 * Triggers account provisioning when order becomes active
 */
async function onOrderActivated(orderId) {
  try {
    const autoEnabled = await isAutoProvisioningEnabled();

    if (!autoEnabled) {
      // Mark order as awaiting manual provisioning and stop
      await prisma.order.update({
        where: { id: orderId },
        data: { provisioningStatus: "pending_manual" },
      }).catch(() => {}); // field may not exist on all schemas — ignore
      console.log(`[PROVISIONING HOOK] Auto-provisioning disabled — order ${orderId} queued for manual provisioning`);
      return;
    }

    console.log(`[PROVISIONING HOOK] Order ${orderId} activated - provisioning...`);

    setImmediate(async () => {
      try {
        await provisioningService.provisionAccount(orderId);
        console.log(`[PROVISIONING] Account provisioned for order ${orderId}`);

        // Fire service activation email
        try {
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { client: true, snapshot: true },
          });

          if (order?.client && order?.snapshot?.service) {
            await emailTriggers.fire('service.activated', {
              clientEmail: order.client.email,
              clientName: order.client.name,
              serviceName: order.snapshot.service.name,
              plan: order.snapshot.planData?.name,
              activatedAt: new Date(),
              controlPanelUrl: process.env.CONTROL_PANEL_URL || 'https://cp.whms.local',
              portalUrl: process.env.PORTAL_URL || 'https://portal.whms.local',
              docsUrl: process.env.DOCS_URL || 'https://docs.whms.local',
              supportEmail: process.env.SUPPORT_EMAIL || 'support@whms.local',
            });
          }
        } catch (emailErr) {
          console.error(`[PROVISIONING] Failed to send activation email for order ${orderId}:`, emailErr.message);
        }
      } catch (err) {
        console.error(`[PROVISIONING] Failed to provision order ${orderId}:`, err.message);
      }
    });
  } catch (err) {
    console.error(`[PROVISIONING HOOK] Activation hook failed:`, err.message);
  }
}

/**
 * HOOK 2: Order Termination Hook
 * Called from: order.service.terminate(orderId)
 *
 * Triggers account deletion when order is terminated
 */
async function onOrderTerminated(orderId) {
  try {
    console.log(
      `[PROVISIONING HOOK] Order ${orderId} terminated - deprovisioning...`
    );

    // Fire and forget
    setImmediate(async () => {
      try {
        await provisioningService.deprovisionAccount(orderId);
        console.log(`[PROVISIONING] Account deprovisioned for order ${orderId}`);

        // Fire service termination email
        try {
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { client: true, snapshot: true },
          });

          if (order?.client && order?.snapshot?.service) {
            await emailTriggers.fire('service.terminated', {
              clientEmail: order.client.email,
              clientName: order.client.name,
              serviceName: order.snapshot.service.name,
              terminatedAt: new Date(),
              portalUrl: process.env.PORTAL_URL || 'https://portal.whms.local',
              supportEmail: process.env.SUPPORT_EMAIL || 'support@whms.local',
            });
          }
        } catch (emailErr) {
          console.error(`[PROVISIONING] Failed to send termination email for order ${orderId}:`, emailErr.message);
        }
      } catch (err) {
        console.error(
          `[PROVISIONING] Failed to deprovision order ${orderId}:`,
          err.message
        );
        // Don't block termination, just log
      }
    });
  } catch (err) {
    console.error(`[PROVISIONING HOOK] Termination hook failed:`, err.message);
  }
}

/**
 * HOOK 3: Invoice Overdue Hook
 * Called from: billing.cron.markOverdue() or manual invoice status change
 *
 * Suspends hosting account when invoice becomes overdue (unpaid)
 */
async function onInvoiceOverdue(invoiceId, orderId) {
  try {
    console.log(
      `[PROVISIONING HOOK] Invoice ${invoiceId} overdue - suspending account...`
    );

    setImmediate(async () => {
      try {
        await provisioningService.suspendAccount(orderId, "invoice-overdue");
        console.log(`[PROVISIONING] Account suspended for order ${orderId}`);

        // Fire service suspension email
        try {
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { client: true, snapshot: true },
          });

          if (order?.client && order?.snapshot?.service) {
            await emailTriggers.fire('service.suspended', {
              clientEmail: order.client.email,
              clientName: order.client.name,
              serviceName: order.snapshot.service.name,
              reason: 'Payment overdue',
              suspendedAt: new Date(),
              retentionDays: 30,
              invoiceUrl: `${process.env.PORTAL_URL || 'https://portal.whms.local'}/invoices`,
              supportEmail: process.env.SUPPORT_EMAIL || 'support@whms.local',
            });
          }
        } catch (emailErr) {
          console.error(`[PROVISIONING] Failed to send suspension email for order ${orderId}:`, emailErr.message);
        }
      } catch (err) {
        console.error(
          `[PROVISIONING] Failed to suspend order ${orderId}:`,
          err.message
        );
      }
    });
  } catch (err) {
    console.error(`[PROVISIONING HOOK] Overdue hook failed:`, err.message);
  }
}

/**
 * HOOK 4: Invoice Paid Hook
 * Called from: payment.service.handleGatewayCallback() or recordPayment()
 *
 * Unsuspends hosting account when invoice is paid
 */
async function onInvoicePaid(invoiceId, orderId) {
  try {
    console.log(
      `[PROVISIONING HOOK] Invoice ${invoiceId} paid - unsuspending account...`
    );

    setImmediate(async () => {
      try {
        await provisioningService.unsuspendAccount(orderId);
        console.log(`[PROVISIONING] Account unsuspended for order ${orderId}`);

        // Fire service resumption notification (reuse 'service.activated' template)
        try {
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { client: true, snapshot: true },
          });

          if (order?.client && order?.snapshot?.service) {
            await emailTriggers.fire('service.activated', {
              clientEmail: order.client.email,
              clientName: order.client.name,
              serviceName: order.snapshot.service.name,
              plan: order.snapshot.planData?.name,
              activatedAt: new Date(),
              controlPanelUrl: process.env.CONTROL_PANEL_URL || 'https://cp.whms.local',
              portalUrl: process.env.PORTAL_URL || 'https://portal.whms.local',
              docsUrl: process.env.DOCS_URL || 'https://docs.whms.local',
              supportEmail: process.env.SUPPORT_EMAIL || 'support@whms.local',
            });
          }
        } catch (emailErr) {
          console.error(`[PROVISIONING] Failed to send resumption email for order ${orderId}:`, emailErr.message);
        }
      } catch (err) {
        console.error(
          `[PROVISIONING] Failed to unsuspend order ${orderId}:`,
          err.message
        );
      }
    });
  } catch (err) {
    console.error(`[PROVISIONING HOOK] Paid hook failed:`, err.message);
  }
}

module.exports = {
  onOrderActivated,
  onOrderTerminated,
  onInvoiceOverdue,
  onInvoicePaid,
};
