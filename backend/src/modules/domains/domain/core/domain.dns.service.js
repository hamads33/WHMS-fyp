const dnsRepo = require("../repositories/dns.repo");
const domainRepo = require("../repositories/domain.repo");
const { loadRegistrar } = require("../../registrars");
const { logDomainAction } = require("../repositories/domainLog.repo");

/**
 * List DNS records
 */
async function listDNS({ domainId }) {
  return dnsRepo.listRecords(domainId);
}

/**
 * Add DNS record
 */
async function addDNSRecord({ domainId, record }) {
  const domain = await domainRepo.findDomainById(domainId);
  if (!domain) throw new Error("Domain not found");

  const created = await dnsRepo.createRecord(domainId, record);

  // Optional registrar sync
  const registrar = loadRegistrar(domain.registrar);
  if (registrar.updateDNSRecords) {
    await registrar.updateDNSRecords(domain.name);
  }

  await logDomainAction(domainId, "dns_record_added", record);
  return created;
}

/**
 * Update DNS record
 */
async function updateDNSRecord({ domainId, recordId, updates }) {
  const updated = await dnsRepo.updateRecord(recordId, updates);
  await logDomainAction(domainId, "dns_record_updated", updates);
  return updated;
}

/**
 * Delete DNS record
 */
async function deleteDNSRecord({ domainId, recordId }) {
  const deleted = await dnsRepo.deleteRecord(recordId);
  await logDomainAction(domainId, "dns_record_deleted", { recordId });
  return deleted;
}

module.exports = {
  listDNS,
  addDNSRecord,
  updateDNSRecord,
  deleteDNSRecord
};
