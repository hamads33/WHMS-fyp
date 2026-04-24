/**
 * Domain Service
 * WHMCS-grade, module-based implementation
 *
 * Responsibilities:
 * - Availability check
 * - WHOIS/contact validation
 * - Billing stub coupling
 * - Registrar registration
 * - Persistence + audit logging
 *
 * Currency is ADMIN-SELECTED and passed explicitly.
 */

const prisma = require("../../../../../prisma");
const { loadRegistrar, loadRegistrarWithFallback } = require("../../registrars");
const { logDomainAction } = require("../repositories/domainLog.repo");
const { createDomainContacts } = require("../repositories/domainContact.repo");
const { validateContacts } = require("../../validators/domainContact.validator");
const { createInvoice } = require("../../billing/billing.stub");
const domainRepo = require("../repositories/domain.repo");
const { toPennies } = require("../../utils/pennies");
const hookRegistry = require("../../../../../core/plugin-system/hook.registry");


/**
 * Check domain availability
 */
async function checkAvailability({ domain, registrar }) {
  if (!domain || !registrar) {
    throw new Error("domain and registrar are required");
  }

  const { module: registrarModule, isMock, reason } = await loadRegistrarWithFallback(registrar);

  if (typeof registrarModule.checkAvailability !== "function") {
    throw new Error(`Registrar ${registrar} does not support availability check`);
  }

  const result = await registrarModule.checkAvailability(domain);

  return {
    domain,
    available: Boolean(result.available),
    premium: Boolean(result.premium),
    price: result.price ?? null,
    ...(isMock && { isMock: true, warning: reason })
  };
}

/**
 * Register domain (FULL FLOW)
 */
async function registerDomain({
  domain,
  ownerId,
  registrar,

  // registration config
  years = 1,
  nameservers = [],
  contacts = [],

  // billing (ADMIN SELECTED)
  currency,
  priceOverride = null
}) {
  // ─────────────────────────────
  // 1️⃣ Validation
  // ─────────────────────────────
  if (!domain || !ownerId || !registrar) {
    throw new Error("domain, ownerId, and registrar are required");
  }

  if (!currency) {
    throw new Error("currency must be selected by admin");
  }

  if (years < 1 || years > 10) {
    throw new Error("Domain registration period must be between 1 and 10 years");
  }

  // ✅ VALIDATE: Owner user exists
  const ownerUser = await prisma.user.findUnique({
    where: { id: ownerId }
  });

  if (!ownerUser) {
    throw new Error(`User with ID ${ownerId} does not exist`);
  }

  validateContacts(contacts);

  // ─────────────────────────────
  // 2️⃣ Prevent duplicate domain
  // ─────────────────────────────
  const existing = await domainRepo.findDomainByName(domain);
  if (existing) {
    throw new Error("Domain already exists in system");
  }

  // ─────────────────────────────
  // 3️⃣ Load registrar module
  // ─────────────────────────────
  const { module: registrarModule, isMock: isMockRegistrar, reason: mockReason } = await loadRegistrarWithFallback(registrar);

  // ─────────────────────────────
  // 4️⃣ Availability check (MANDATORY)
  // ─────────────────────────────
  if (typeof registrarModule.checkAvailability !== "function") {
    throw new Error(`Registrar ${registrar} does not support availability check`);
  }

  const availability = await registrarModule.checkAvailability(domain);

  if (!availability.available) {
    throw new Error("Domain is not available for registration");
  }

  // Determine final price (admin override > registrar price)
  const finalPrice =
    priceOverride !== null
      ? toPennies(priceOverride, "priceOverride")
      : availability.price !== null && availability.price !== undefined
        ? toPennies(availability.price, "availability price")
        : null;

  // ─────────────────────────────
  // 5️⃣ Billing boundary (STUB)
  // ─────────────────────────────
  const invoice = await createInvoice({
    ownerId,
    domain,
    amount: finalPrice,
    currency,
    description: `Domain registration: ${domain} (${years} year)`
  });

  if (invoice.status !== "paid") {
    throw new Error("Invoice not paid. Domain registration halted.");
  }

  // ─────────────────────────────
  // 6️⃣ Registrar registration
  // ─────────────────────────────
  if (typeof registrarModule.registerDomain !== "function") {
    throw new Error(`Registrar ${registrar} does not support registration`);
  }

  const regResult = await registrarModule.registerDomain({
    domain,
    years,
    nameservers,
    contacts
  });

  if (!regResult || regResult.success !== true) {
    throw new Error("Registrar registration failed");
  }

  // ─────────────────────────────
  // 7️⃣ Persist domain
  // ─────────────────────────────
  const createdDomain = await domainRepo.createDomain({
    name: domain,
    ownerId,
    registrar,
    status: "active",
    expiryDate: regResult.expiryDate,
    autoRenew: true,
    nameservers,
    registrationPrice: finalPrice,
    currency,
  });

  // ─────────────────────────────
  // 8️⃣ Persist WHOIS contacts
  // ─────────────────────────────
  await createDomainContacts(createdDomain.id, contacts);

  // Optional registrar contact sync
  if (typeof registrarModule.updateContacts === "function") {
    await registrarModule.updateContacts({
      domain,
      contacts
    });
  }

  // ─────────────────────────────
  // 9️⃣ Audit & domain logs
  // ─────────────────────────────
  await logDomainAction(createdDomain.id, "domain_availability_checked", {
    registrar,
    price: availability.price
  });

  await logDomainAction(createdDomain.id, "domain_invoiced", {
    invoiceId: invoice.invoiceId,
    amount: finalPrice,
    currency
  });

  await logDomainAction(createdDomain.id, "domain_registered", {
    registrar,
    years,
    expiryDate: regResult.expiryDate
  });

  await logDomainAction(createdDomain.id, "domain_contacts_created", {
    count: contacts.length
  });

  // Notify plugin hooks — fires asynchronously, never blocks registration
  hookRegistry.trigger("domain.registered", {
    domainId   : createdDomain.id,
    domainName : createdDomain.name,
    ownerId    : createdDomain.ownerId,
    registrar,
    years,
    expiryDate : regResult.expiryDate,
    isMock     : isMockRegistrar,
  }).catch(() => {});

  if (isMockRegistrar) {
    return { ...createdDomain, isMock: true, warning: mockReason || "Domain registered with mock registrar — for testing only, not a real domain" };
  }

  return createdDomain;
}

module.exports = {
  checkAvailability,
  registerDomain
};
