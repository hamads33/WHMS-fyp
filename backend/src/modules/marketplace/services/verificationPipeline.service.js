/**
 * verificationPipeline.service.js (Marketplace-side)
 *
 * Marketplace performs static verification + delegates runtime smoke-test
 * to the plugin module's RuntimeVerifierService (direct import).
 */

const prisma = require('../../../db/prisma');

const SignatureService = require('./signature.service');
const StaticAnalysisService = require('./staticAnalysis.service');
const MalwareScanService = require('./malwareScan.service');
const DependencyInstaller = require('./dependencyInstaller.service'); // metadata validation only
const BuildLogService = require('./buildLog.service');
const AnalyticsService = require('./analytics.service');

// direct import of plugin runtime verifier (modular-monolith)
const RuntimeVerifierService = require('../../plugins/services/runtimeVerifier.service');

const { validate: validateManifest } = require('../validators/manifest.validator');

const VerificationPipeline = {
  async run(ctx = {}) {
    const {
      submissionId,
      productId,
      versionId,
      archivePath,
      archiveUrl,
      manifestJson,
      sellerId,
      signature,
      pluginFolder,
      runtimeTest = false
    } = ctx;

    const report = { passed: true, steps: [], issues: [] };

    const appendLog = async (level, step, message, meta) => {
      try {
        await BuildLogService.append({
          submissionId,
          productId,
          versionId,
          level,
          step,
          message,
          meta
        });
      } catch (_) {}
    };

    if (!archivePath && !archiveUrl && !pluginFolder) {
      report.passed = false;
      report.issues.push({ code: 'NO_ARCHIVE', message: 'archivePath/archiveUrl/pluginFolder missing' });
      await appendLog('error', 'verify.init', 'archive missing');
      return this._saveAndFinalize(report, ctx);
    }

    // signature
    try {
      const seller = await prisma.marketplaceSeller.findUnique({ where: { id: sellerId } });
      if (seller && seller.publicKey) {
        const ok = await SignatureService.verifyArchiveWithSignature(archivePath, signature, seller.publicKey);
        if (!ok) {
          report.passed = false;
          report.issues.push({ code: 'SIGNATURE_INVALID', message: 'signature verification failed' });
          await appendLog('error', 'verify.signature', 'Signature invalid');
        } else {
          await appendLog('info', 'verify.signature', 'Signature OK');
        }
      } else {
        await appendLog('warn', 'verify.signature', 'No public key for seller; skipping signature verification');
      }
      report.steps.push({ name: 'signature' });
    } catch (err) {
      report.passed = false;
      report.issues.push({ code: 'SIGNATURE_ERROR', message: err.message });
      await appendLog('error', 'verify.signature', err.message);
    }

    // manifest
    try {
      const ok = validateManifest(manifestJson);
      if (!ok) {
        const errs = (validateManifest.errors || []).map(e => `${e.instancePath} ${e.message}`);
        report.passed = false;
        report.issues.push({ code: 'MANIFEST_INVALID', details: errs });
        await appendLog('error', 'verify.manifest', `Manifest invalid: ${errs.join('; ')}`);
      } else {
        await appendLog('info', 'verify.manifest', 'Manifest OK');
      }
      report.steps.push({ name: 'manifest' });
    } catch (err) {
      report.passed = false;
      report.issues.push({ code: 'MANIFEST_ERROR', message: err.message });
      await appendLog('error', 'verify.manifest', err.message);
    }

    // static analysis
    try {
      if (pluginFolder) {
        const result = await StaticAnalysisService.analyzeFolder(pluginFolder, { maxFileSizeMB: 10, maxFiles: 5000 });
        if (!result.passed) {
          report.passed = false;
          report.issues.push({ code: 'STATIC_ISSUES', details: result.issues });
          await appendLog('warn', 'verify.static', `Static issues: ${JSON.stringify(result.issues).slice(0,2000)}`);
        } else {
          await appendLog('info', 'verify.static', 'Static analysis OK');
        }
      } else {
        await appendLog('warn', 'verify.static', 'No pluginFolder provided - skip static analysis');
      }
      report.steps.push({ name: 'static_analysis' });
    } catch (err) {
      report.passed = false;
      report.issues.push({ code: 'STATIC_ERROR', message: err.message });
      await appendLog('error', 'verify.static', err.message);
    }

    // malware
    try {
      if (pluginFolder) {
        const m = await MalwareScanService.scanFolder(pluginFolder);
        if (!m.passed) {
          report.passed = false;
          report.issues.push({ code: 'MALWARE_FINDINGS', details: m.findings });
          await appendLog('error', 'verify.malware', `Malware findings: ${JSON.stringify(m.findings).slice(0,2000)}`);
        } else {
          await appendLog('info', 'verify.malware', 'Malware scan OK');
        }
      }
      report.steps.push({ name: 'malware_scan' });
    } catch (err) {
      report.passed = false;
      report.issues.push({ code: 'MALWARE_ERROR', message: err.message });
      await appendLog('error', 'verify.malware', err.message);
    }

    // dependency metadata
    try {
      if (manifestJson && manifestJson.dependencies) {
        const depCheck = await DependencyInstaller.validateMetadata(manifestJson.dependencies);
        if (!depCheck.passed) {
          report.issues.push({ code: 'DEPENDENCY_METADATA_ISSUES', details: depCheck.issues });
          await appendLog('warn', 'verify.deps', `Dependency metadata issues: ${JSON.stringify(depCheck.issues).slice(0,2000)}`);
        } else {
          await appendLog('info', 'verify.deps', 'Dependency metadata OK');
        }
      }
      report.steps.push({ name: 'dependency_metadata' });
    } catch (err) {
      report.issues.push({ code: 'DEPENDENCY_METADATA_ERROR', message: err.message });
      await appendLog('error', 'verify.deps', err.message);
    }

    // runtime test (DELEGATE to plugin module runtime verifier)
    if (runtimeTest) {
      try {
        // call plugin module verifier directly (modular-monolith)
        await appendLog('info', 'verify.runtime', 'Invoking plugin module runtime verifier', { productId, versionId });

        const runtimeResult = await RuntimeVerifierService.run({
          submissionId,
          productId,
          versionId,
          archivePath,
          pluginFolder,
          manifest: manifestJson,
          timeoutMs: Number(process.env.RUNTIME_VERIFY_TIMEOUT_MS || 5000)
        });

        // runtimeResult: { passed: boolean, logs: [...], details: {...} }
        if (!runtimeResult || runtimeResult.passed !== true) {
          report.passed = false;
          report.issues.push({ code: 'RUNTIME_FAIL', details: runtimeResult || { error: 'no-result' } });
          await appendLog('error', 'verify.runtime', `Runtime failed: ${JSON.stringify(runtimeResult).slice(0,2000)}`);
        } else {
          await appendLog('info', 'verify.runtime', `Runtime OK: ${JSON.stringify(runtimeResult).slice(0,2000)}`);
        }

        report.runtimeReport = runtimeResult;
        report.steps.push({ name: 'runtime_test' });
      } catch (err) {
        report.passed = false;
        report.issues.push({ code: 'RUNTIME_ERROR', message: err.message });
        await appendLog('error', 'verify.runtime', err.message);
      }
    }

    // save verification result
    await this._saveReportToDB(report, { productId, versionId, submissionId }, appendLog);

    return this._finalize(report);
  },

  async _saveReportToDB(report, ids, appendLog) {
    const { productId, versionId } = ids;
    try {
      const row = await prisma.marketplaceVerification.create({
        data: {
          productId,
          versionId,
          passed: report.passed,
          issues: report.issues.length ? report.issues : null,
          runtimeReport: report.runtimeReport || null
        }
      });

      await appendLog('info', 'verify.save', `Saved verification ${row.id}`);
      await require('../../../db/prisma').$disconnect?.(); // no-op if not supported
      await require('./analytics.service').track({
        productId,
        versionId,
        eventType: report.passed ? 'version.verified' : 'version.verify_failed',
        meta: report
      }).catch(()=>{});
    } catch (err) {
      await appendLog('error', 'verify.save.fail', err.message);
    }
  },

  _finalize(report) {
    return report;
  }
};

module.exports = VerificationPipeline;
