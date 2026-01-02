const { loadRegistrar } = require("../../registrars");
const domainRepo = require("../repositories/domain.repo");
const { logDomainAction } = require("../repositories/domainLog.repo");
const { createInvoice } = require("../../billing/billing.stub");

/**
 * Admin manual domain renewal
 */
async function adminRenewDomain({
  domainId,
  adminId,
  years = 1,
  callRegistrar = true,
  priceOverride = null,
  currency
}) {
  // ─────────────────────────────
  // 1️⃣ Validation
  // ─────────────────────────────
  if (!domainId || !adminId) {
    throw new Error("domainId and adminId are required");
  }

  if (!currency) {
    throw new Error("currency must be selected by admin");
  }

  if (years < 1 || years > 10) {
    throw new Error("Renewal years must be between 1 and 10");
  }

  // ─────────────────────────────
  // 2️⃣ Load domain
  // ─────────────────────────────
  const domain = await domainRepo.findDomainById(domainId);

  if (!domain) {
    throw new Error("Domain not found");
  }

  // ─────────────────────────────
  // 3️⃣ Billing stub (BOUNDARY)
  // ─────────────────────────────
  const renewalAmount =
    priceOverride ?? domain.renewalPrice ?? domain.registrationPrice;

  const invoice = await createInvoice({
    ownerId: domain.ownerId,
    domain: domain.name,
    amount: renewalAmount,
    currency,
    description: `Manual domain renewal: ${domain.name} (${years} year)`
  });

  if (invoice.status !== "paid") {
    throw new Error("Invoice not paid. Renewal halted.");
  }

  // ─────────────────────────────
  // 4️⃣ Registrar renewal (OPTIONAL)
  // ─────────────────────────────
  if (callRegistrar) {
    const registrarModule = loadRegistrar(domain.registrar);

    if (typeof registrarModule.renewDomain !== "function") {
      throw new Error(
        `Registrar ${domain.registrar} does not support renewals`
      );
    }

    const result = await registrarModule.renewDomain({
      domain: domain.name,
      years
    });

    if (!result || result.success !== true) {
      throw new Error("Registrar renewal failed");
    }
  }

  // ─────────────────────────────
  // 5️⃣ Calculate new expiry
  // ─────────────────────────────
  const baseDate =
    domain.expiryDate && domain.expiryDate > new Date()
      ? domain.expiryDate
      : new Date();

  const newExpiry = new Date(baseDate);
  newExpiry.setFullYear(newExpiry.getFullYear() + years);

  // ─────────────────────────────
  // 6️⃣ Update domain (SCHEMA-SAFE)
  // ─────────────────────────────
  const updatedDomain = await domainRepo.updateDomain(domain.id, {
    expiryDate: newExpiry,
    status: "active",
    renewalPrice: renewalAmount,
    currency
  });

  // ─────────────────────────────
  // 7️⃣ Audit log (BILLING LINK HERE)
  // ─────────────────────────────
  await logDomainAction(domain.id, "admin_domain_renewed", {
    adminId,
    years,
    amount: renewalAmount,
    currency,
    invoiceId: invoice.invoiceId,
    registrarCalled: callRegistrar
  });

  return updatedDomain;
}

module.exports = {
  adminRenewDomain
};
