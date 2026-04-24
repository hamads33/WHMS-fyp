const domainRepo = require("../domain/repositories/domain.repo");
const { loadRegistrar } = require("../registrars");
const { logDomainAction } = require("../domain/repositories/domainLog.repo");
const { emitAutomationEvent } = require("../../automation/lib/runtime-events");

async function syncDomains(options = {}) {
  const { app, source = "domain_sync_job" } = options;
  const domains = await domainRepo.listAllDomains();
  const summary = {
    processed: domains.length,
    updated: 0,
    failed: 0,
    statusChanges: 0,
    expiryChanges: 0,
  };

  for (const domain of domains) {
    try {
      const registrar = loadRegistrar(domain.registrar);

      if (!registrar.syncDomain) continue;

      const remote = await registrar.syncDomain(domain.name);

      const changes = {};

      if (remote.expiryDate && remote.expiryDate.getTime() !== domain.expiryDate?.getTime()) {
        changes.expiryDate = remote.expiryDate;
      }

      if (remote.status && remote.status !== domain.status) {
        changes.status = remote.status;
      }

      if (Object.keys(changes).length > 0) {
        await domainRepo.updateDomain(domain.id, changes);
        await logDomainAction(domain.id, "domain_synced", changes);
        summary.updated += 1;

        await emitAutomationEvent(
          app,
          "domain.synced",
          {
            domainId: domain.id,
            domain: domain.name,
            registrar: domain.registrar,
            changes,
          },
          { source }
        );

        if (changes.expiryDate) {
          summary.expiryChanges += 1;
          await emitAutomationEvent(
            app,
            "domain.expiry_changed",
            {
              domainId: domain.id,
              domain: domain.name,
              previousExpiryDate: domain.expiryDate,
              newExpiryDate: changes.expiryDate,
              registrar: domain.registrar,
            },
            { source }
          );
        }

        if (changes.status) {
          summary.statusChanges += 1;
          await emitAutomationEvent(
            app,
            "domain.status_changed",
            {
              domainId: domain.id,
              domain: domain.name,
              previousStatus: domain.status,
              newStatus: changes.status,
              registrar: domain.registrar,
            },
            { source }
          );
        }
      }

    } catch (err) {
      summary.failed += 1;
      await logDomainAction(domain.id, "domain_sync_failed", {
        error: err.message
      });

      await emitAutomationEvent(
        app,
        "domain.sync_failed",
        {
          domainId: domain.id,
          domain: domain.name,
          registrar: domain.registrar,
          error: err.message,
        },
        { source }
      );
    }
  }

  return summary;
}

module.exports = { syncDomains };
