const domainRepo = require("../repositories/domain.repo");
const { logDomainAction } = require("../repositories/domainLog.repo");

/**
 * Admin override domain fields
 */
async function adminOverrideDomain({
  domainId,
  adminId,
  changes
}) {
  if (!domainId || !adminId || !changes) {
    throw new Error("domainId, adminId, and changes are required");
  }

  const domain = await domainRepo.findDomainById(domainId);
  if (!domain) {
    throw new Error("Domain not found");
  }

  const updated = await domainRepo.updateDomain(domainId, changes);

  await logDomainAction(domainId, "admin_domain_override", {
    adminId,
    changes
  });

  return updated;
}

module.exports = {
  adminOverrideDomain
};
