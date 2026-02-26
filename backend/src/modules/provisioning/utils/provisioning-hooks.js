/**
 * Provisioning Integration Hooks
 * Path: src/modules/provisioning/utils/provisioning-hooks.js
 *
 * These hooks are called from Orders and Billing modules
 * to trigger provisioning actions on lifecycle events
 */

const provisioningService = require("../services/provisioning.service");
const prisma = require("../../../../prisma");

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
        // TODO: Send client notification that service suspended
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
        // TODO: Send client notification that service is active
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
