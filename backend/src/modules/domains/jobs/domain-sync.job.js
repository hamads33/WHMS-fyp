const domainRepo = require("../domain/repositories/domain.repo");
const { loadRegistrar } = require("../registrars");
const { logDomainAction } = require("../domain/repositories/domainLog.repo");

async function syncDomains() {
  const domains = await domainRepo.listAllDomains();

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
      }

    } catch (err) {
      await logDomainAction(domain.id, "domain_sync_failed", {
        error: err.message
      });
    }
  }
}

module.exports = { syncDomains };
