// src/modules/domains/domain.service.js

const repo = require('../repositories/domain.repository');
const whoisClient = require('../providers/whois.client');
const providerFactory = require('../domainProviders/registry');
const { validateDomain } = require('../validators/domain.validators');
const events = require('../events/domain.events');
const parseWhois = require("../providers/parseWhois");

// Porkbun real provider
const porkbun = require('../domainProviders/porkbun.provider');

// ------------------------------------------------------
// Get All Domains
// ------------------------------------------------------
async function getAllDomains() {
  return repo.findAll();
}

// ------------------------------------------------------
// Get Domain By ID
// ------------------------------------------------------
async function getDomainById(id) {
  return repo.findById(Number(id));
}

// ------------------------------------------------------
// Domain Availability (Porkbun + WHOIS fallback)
// ------------------------------------------------------
async function checkAvailability(domain) {
  if (!validateDomain(domain)) throw new Error("Invalid domain format");

  // Prefer Porkbun API for real check
  try {
    const res = await porkbun.checkDomain(domain);

    if (res?.status === "SUCCESS" && res.response) {
      return {
        domain,
        available: res.response.avail === "yes",
        porkbun: res
      };
    }
  } catch (err) {
    console.warn("Porkbun availability error:", err.message);
  }

  // WHOIS fallback
  const raw = await whoisClient.lookup(domain);
  const normalized = String(raw).toLowerCase();

  const unavailableKeywords = [
    "no match", "not found", "no entries found", "status: free"
  ];

  const registered = normalized && !unavailableKeywords.some(k => normalized.includes(k));

  return { domain, available: !registered, raw };
}

// ------------------------------------------------------
// WHOIS Lookup
// ------------------------------------------------------
async function whoisLookup(domain) {
  if (!validateDomain(domain)) throw new Error("Invalid domain");

  const raw = await whoisClient.lookup(domain);

  console.log("\n======== WHOIS RAW =========");
  console.log(raw);
  console.log("============================\n");

  const parsed = parseWhois(raw);

  return { domain, raw, parsed };
}

// ------------------------------------------------------
// Register Domain (Porkbun real or Mock)
// ------------------------------------------------------
async function registerDomain(payload) {
  const { domain, provider = "mock", contact = {}, years = 1 } = payload;

  if (!validateDomain(domain)) 
    return { success: false, error: "Invalid domain" };

  // REAL PORKBUN REGISTRATION
  if (provider === "porkbun") {
    const body = {
      domain,
      years: String(years),
      registrantContact: contact
    };

    const res = await porkbun.registerDomain(domain, years, contact);

    if (!res || res.status !== "SUCCESS") {
      return { success: false, error: res?.message || "Porkbun registration failed", raw: res };
    }

    const dbRecord = {
      name: domain,
      provider: "porkbun",
      expiryDate: new Date(Date.now() + years * 365 * 24 * 3600 * 1000),
      nameservers: [],
      status: "active",
      metadata: { porkbun: res }
    };

    const existing = await repo.findByName(domain);
    const saved = existing
      ? await repo.update(existing.id, dbRecord)
      : await repo.create(dbRecord);

    events.emitDomainRegistered(saved);

    return { success: true, domain: saved, raw: res };
  }

  // MOCK PROVIDER
  const client = providerFactory(provider);

  if (!client) return { success: false, error: "Unknown provider" };

  const providerResult = await client.registerDomainWithAPI(domain, { contact });

  if (!providerResult || providerResult.success !== true) {
    return { success: false, error: providerResult?.error || "Provider registration failed" };
  }

  const data = {
    name: domain,
    provider,
    expiryDate: providerResult.expiryDate ? new Date(providerResult.expiryDate) : null,
    nameservers: providerResult.nameservers || [],
    status: "active",
    metadata: providerResult.metadata || {}
  };

  const existing = await repo.findByName(domain);
  const saved = existing
    ? await repo.update(existing.id, data)
    : await repo.create(data);

  events.emitDomainRegistered(saved);

  return { success: true, domain: saved };
}

// ------------------------------------------------------
// Add DNS Record (Porkbun or Mock)
// ------------------------------------------------------
async function addDnsRecord(domainId, record) {
  const domain = await repo.findById(domainId);
  if (!domain) throw new Error("Domain not found");

  const domainName = domain.name;

  // REAL PORKBUN DNS
  if (domain.provider === "porkbun") {
    const res = await porkbun.dnsCreate(domainName, {
      type: record.type,
      name: record.name,
      content: record.value,
      ttl: record.ttl || 3600
    });

    return {
      success: true,
      provider: "porkbun",
      providerId: res?.id || null,
      raw: res
    };
  }

  // MOCK DNS
  const dnsRecords = domain.metadata?.dnsRecords || [];
  dnsRecords.push(record);

  return repo.update(domainId, {
    metadata: { ...domain.metadata, dnsRecords }
  });
}

// ------------------------------------------------------
// Delete Domain (soft delete only)
// ------------------------------------------------------
async function deleteDomain(id) {
  const domain = await repo.findById(id);
  if (!domain) return null;

  // Porkbun does NOT have domain cancellation API
  await repo.softDelete(id);

  events.emitDomainDeleted(domain);

  return true;
}

// ------------------------------------------------------
// Update Nameservers
// ------------------------------------------------------
async function updateNameservers(id, nameservers) {
  const domain = await repo.findById(id);
  if (!domain) throw new Error("Domain not found");

  // Real Porkbun sync
  if (domain.provider === "porkbun") {
    await porkbun.updateNameservers(domain.name, nameservers);
  } else {
    // Mock provider
    const provider = providerFactory(domain.provider || "mock");
    await provider.updateNameservers(domain.name, nameservers);
  }

  // Update DB
  return repo.update(id, {
    nameservers,
    updatedAt: new Date()
  });
}

// ------------------------------------------------------
// Pricing — Porkbun real
// ------------------------------------------------------
async function getPricing() {
  const res = await porkbun.getPricing();

  if (!res || res.status !== "SUCCESS") {
    throw new Error(res?.message || "Failed to fetch pricing");
  }

  return res.pricing || res;
}
// sync pricing from Porkbun and store in Tld table
async function syncPricingToDb() {
  const porkbunRes = await porkbun.getPricing();
  if (!porkbunRes || porkbunRes.status !== "SUCCESS") {
    throw new Error(porkbunRes?.message || "Porkbun pricing failed");
  }

  const pricing = porkbunRes.pricing || {};
  const tlds = Object.entries(pricing); // [ [".com", {...}], ... ]

  const results = [];
  for (const [name, vals] of tlds) {
    // convert to cents
    const registerPrice = Math.round(Number(vals.registration) * 100);
    const renewPrice = Math.round(Number(vals.renewal) * 100);
    const transferPrice = Math.round(Number(vals.transfer) * 100);

    // upsert via repo (add new methods in repo)
    const existing = await repo.findTldByName(name);

    const data = {
      name,
      registerPrice,
      renewPrice,
      transferPrice,
      providerData: vals,
      lastSynced: new Date()
    };

    if (existing) {
      const updated = await repo.updateTld(existing.id, data);
      results.push(updated);
    } else {
      const created = await repo.createTld(data);
      results.push(created);
    }
  }

  return results;
}


// ------------------------------------------------------
module.exports = {
  getAllDomains,
  getDomainById,
  checkAvailability,
  whoisLookup,
  registerDomain,
  addDnsRecord,
  deleteDomain,
  updateNameservers,
  getPricing,
  syncPricingToDb
};
