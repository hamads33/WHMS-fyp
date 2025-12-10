// src/modules/marketplace/services/approvalIntegration.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PluginInstaller = require('../../plugins/pluginInstaller.service');
const BuildLogStore = require('../stores/buildLogStore'); // assumed store with .log({..})
// const WebhookEmitter = require('../utils/webhookEmitter');
// const AnalyticsService = require('./analytics.service'); // optional, safe-guarded
const Logger = console; // swap with your logger

/**
 * Approve a submission -> publish product -> install plugin -> finalize verification + emit webhooks
 *
 * Behavior:
 *  - Idempotent: if submission already approved, returns current state
 *  - Uses a small DB transaction to mark submission + product as approved before install
 *  - Runs installer (I/O) after DB transaction to avoid long DB locks
 *  - On installer failure, marks submission failed and writes build log
 *
 * Usage:
 *   await ApprovalIntegration.approveSubmission('sub-1', adminId);
 */
const ApprovalIntegration = {
  async approveSubmission(submissionId, adminId) {
    if (!submissionId) throw new Error('submissionId required');

    // 1) load submission + version + product (fresh)
    const submission = await prisma.marketplaceSubmission.findUnique({
      where: { id: submissionId },
      include: {
        product: true,
        version: true,
        reviewer: true
      }
    });

    if (!submission) throw new Error('Submission not found');

    // If already approved -> idempotent return
    if (submission.status === 'approved') {
      Logger.info(`Submission ${submissionId} already approved`);
      return { ok: true, message: 'already-approved', submission };
    }

    // Keep local references for logging
    const product = submission.product;
    const version = submission.version;

    if (!product) {
      throw new Error('Submission has no associated product');
    }

    // 2) mark submission & product as approved in a transaction (fast)
    let txResult;
    try {
      txResult = await prisma.$transaction([
        prisma.marketplaceSubmission.update({
          where: { id: submissionId },
          data: {
            status: 'approved',
            reviewerId: adminId,
            // optional: keep notes or approvedAt
          }
        }),
        prisma.marketplaceProduct.update({
          where: { id: product.id },
          data: {
            status: 'approved',
            approvedAt: new Date()
          }
        })
      ]);
    } catch (err) {
      Logger.error('DB transaction failed while approving submission', err);
      throw err;
    }

    // 3) record a build log entry: install started
    try {
      await BuildLogStore.log({
        submissionId,
        productId: product.id,
        versionId: version ? version.id : null,
        level: 'info',
        step: 'approve',
        message: `Admin ${adminId} approved submission ${submissionId}. Beginning install pipeline.`
      });
    } catch (err) {
      Logger.warn('BuildLogStore.log failed (non-fatal)', err);
    }

    // 4) run plugin installer (I/O heavy) — do not run inside DB transaction
    try {
      if (!version || !version.archivePath) {
        // No version archive — still OK (maybe product only), just emit events
        Logger.info('No version archive to install — skipping plugin installer');
      } else {
        await PluginInstaller.installFromArchive({
          archivePath: version.archivePath,
          productId: product.id,
          version: version.id,
          submissionId
        });

        await BuildLogStore.log({
          submissionId,
          productId: product.id,
          versionId: version.id,
          level: 'info',
          step: 'install',
          message: 'PluginInstaller completed successfully'
        });
      }

      // create verification record (passed)
      await prisma.marketplaceVerification.create({
        data: {
          id: `verify-${submissionId}`,
          productId: product.id,
          versionId: version ? version.id : '',
          passed: true,
          issues: []
        }
      }).catch(() => {
        // ignore unique collision if verification exists
      });

      // analytics
      try {
        if (AnalyticsService && AnalyticsService.track) {
          AnalyticsService.track({
            productId: product.id,
            versionId: version ? version.id : null,
            eventType: 'submission.approved',
            meta: { submissionId, adminId }
          }).catch(() => {});
        }
      } catch (e) {}

      // emit webhook / notification
      try {
        await WebhookEmitter.emit('product.approved', {
          productId: product.id,
          versionId: version ? version.id : null,
          adminId,
          submissionId
        });
      } catch (err) {
        Logger.warn('WebhookEmitter.emit failed (non-fatal)', err);
      }

      // final response
      const updatedSubmission = await prisma.marketplaceSubmission.findUnique({
        where: { id: submissionId },
        include: { product: true, version: true, reviewer: true }
      });

      return { ok: true, submission: updatedSubmission };
    } catch (err) {
      // Installer failure: mark submission failed-install and log
      Logger.error('Installer failed for submission', submissionId, err);

      await BuildLogStore.log({
        submissionId,
        productId: product.id,
        versionId: version ? version.id : null,
        level: 'error',
        step: 'install',
        message: `Installer error: ${err.message || String(err)}`
      }).catch(() => {});

      // Mark the submission as a failure so admin can re-check
      try {
        await prisma.marketplaceSubmission.update({
          where: { id: submissionId },
          data: {
            status: 'failed-install',
            notes: (submission.notes || '') + `\nInstaller error: ${err.message || String(err)}`
          }
        });
      } catch (dbErr) {
        Logger.error('Failed to mark submission as failed-install', dbErr);
      }

      // Optionally revert product to 'pending' or 'draft' — here we set it to 'published-failed' (non-approved)
      try {
        await prisma.marketplaceProduct.update({
          where: { id: product.id },
          data: {
            status: 'install-failed'
          }
        });
      } catch (dbErr) {
        Logger.warn('Failed to update product.status after install failure', dbErr);
      }

      return { ok: false, error: 'installer_failed', detail: String(err) };
    }
  }
};

module.exports = ApprovalIntegration;
