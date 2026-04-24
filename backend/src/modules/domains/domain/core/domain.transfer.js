const prisma = require("../../../../../prisma");
const { loadRegistrar } = require("../../registrars");
const domainRepo = require("../repositories/domain.repo");
const transferRepo = require("../repositories/domainTransfer.repo");
const { logDomainAction } = require("../repositories/domainLog.repo");
const { createInvoice } = require("../../billing/billing.stub");
const { toPennies } = require("../../utils/pennies");

/**
 * Initiate domain transfer (EPP)
 */
async function initiateTransfer({
  domain,
  ownerId,
  registrar,
  authCode,
  currency,
  transferPrice = null
}) {
  // ─────────────────────────────
  // 1️⃣ Validation
  // ─────────────────────────────
  if (!domain || !ownerId || !registrar || !authCode) {
    throw new Error("domain, ownerId, registrar and authCode are required");
  }

  if (!currency) {
    throw new Error("currency must be selected by admin");
  }

  // ✅ VALIDATE: Owner user exists
  const ownerUser = await prisma.user.findUnique({
    where: { id: ownerId }
  });

  if (!ownerUser) {
    throw new Error(`User with ID ${ownerId} does not exist`);
  }

  // ─────────────────────────────
  // 2️⃣ Domain existence check
  // ─────────────────────────────
  let domainRecord = await domainRepo.findDomainByName(domain);

  if (domainRecord) {
    throw new Error("Domain already exists in system");
  }

  // ─────────────────────────────
  // 3️⃣ Registrar load
  // ─────────────────────────────
  const registrarModule = loadRegistrar(registrar);

  if (typeof registrarModule.transferDomain !== "function") {
    throw new Error(`Registrar ${registrar} does not support transfers`);
  }

  // ─────────────────────────────
  // 4️⃣ Billing (STUB)
  // ─────────────────────────────
  const invoice = await createInvoice({
    ownerId,
    domain,
    amount: transferPrice !== null && transferPrice !== undefined
      ? toPennies(transferPrice, "transferPrice")
      : null,
    currency,
    description: `Domain transfer: ${domain}`
  });

  if (invoice.status !== "paid") {
    throw new Error("Invoice not paid. Transfer halted.");
  }

  // ─────────────────────────────
  // 5️⃣ Call registrar transfer API
  // ─────────────────────────────
  const transferResult = await registrarModule.transferDomain({
    domain,
    authCode,
    cost: transferPrice !== null && transferPrice !== undefined
      ? toPennies(transferPrice, "transferPrice")
      : null,
  });

  if (!transferResult || transferResult.success !== true) {
    throw new Error("Registrar transfer initiation failed");
  }

  // ─────────────────────────────
  // 6️⃣ Create domain in pending state
  // ─────────────────────────────
  domainRecord = await domainRepo.createDomain({
    name: domain,
    ownerId,
    registrar,
    status: "transfer_pending",
    autoRenew: true,
    currency,
    registrationPrice: transferPrice !== null && transferPrice !== undefined
      ? toPennies(transferPrice, "transferPrice")
      : null,
  });

  // ─────────────────────────────
  // 7️⃣ Persist transfer record
  // ─────────────────────────────
  const transfer = await transferRepo.createTransfer({
    domainId: domainRecord.id,
    authCode,
    status: "pending"
  });

  // ─────────────────────────────
  // 8️⃣ Logs
  // ─────────────────────────────
  await logDomainAction(domainRecord.id, "domain_transfer_initiated", {
    registrar,
    invoiceId: invoice.invoiceId
  });

  return {
    domain: domainRecord,
    transfer
  };
}

module.exports = {
  initiateTransfer
};
