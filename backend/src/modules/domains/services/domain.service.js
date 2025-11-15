const repo = require('../repositories/domain.repository');
const whoisClient = require('../providers/whois.client');
const providerFactory = require('../domainProviders/registry');
const { validateDomain } = require('../validators/domain.validators');
const events = require('../events/domain.events');

async function getAllDomains() {
  return repo.findAll();
}

async function getDomainById(id) {
  return repo.findById(Number(id));
}

async function checkAvailability(domain) {
  if (!validateDomain(domain)) throw new Error('Invalid domain format');
  const raw = await whoisClient.lookup(domain);
  // heuristic: if raw is empty or contains "No match" or "NOT FOUND", treat as available
  const normalized = String(raw || '').toLowerCase();
  const unavailableKeywords = ['no match', 'not found', 'no entries found', 'status: free'];
  const registered = normalized && !unavailableKeywords.some(k => normalized.includes(k));
  return { domain, available: !registered, raw };
}

const parseWhois = require("../providers/parseWhois");

async function whoisLookup(domain) {
  if (!validateDomain(domain)) throw new Error("Invalid domain format");

  const raw = await whoisClient.lookup(domain);

  // DEBUG LOG — SEE RAW WHOIS IN TERMINAL
  console.log("=======================================");
  console.log("🌐 WHOIS RAW OUTPUT FOR:", domain);
  console.log("=======================================");
  console.log(raw);
  console.log("=======================================");

  const parsed = parseWhois(raw);

  return { 
    domain, 
    raw, 
    parsed 
  };
}


async function registerDomain(payload) {
  const { domain, provider = 'mock', contact } = payload;
  if (!validateDomain(domain)) return { success: false, error: 'Invalid domain' };

  const client = providerFactory(provider);
  if (!client) return { success: false, error: 'Unknown provider' };

  const providerResult = await client.registerDomainWithAPI(domain, { contact });
  if (!providerResult || providerResult.success !== true) {
    return { success: false, error: providerResult?.error || 'Provider registration failed' };
  }

  const data = {
    name: domain,
    provider,
    expiryDate: providerResult.expiryDate ? new Date(providerResult.expiryDate) : null,
    nameservers: providerResult.nameservers || [],
    status: 'active',
    metadata: providerResult.metadata || {}
  };

  // create or update (idempotency)
  const existing = await repo.findByName(domain);
  if (existing) {
    const updated = await repo.update(existing.id, data);
    events.emitDomainRegistered(updated);
    return { success: true, domain: updated };
  }

  const saved = await repo.create(data);
  events.emitDomainRegistered(saved);
  return { success: true, domain: saved };
}

async function addDnsRecord(domainId, record) {
  const domain = await repo.findById(domainId);
  if (!domain) throw new Error('Domain not found');
  const dnsRecords = (domain.metadata && domain.metadata.dnsRecords) || [];
  dnsRecords.push(record);
  const updated = await repo.update(domainId, { metadata: { ...domain.metadata, dnsRecords } });
  return updated;
}

async function deleteDomain(id) {
  const domain = await repo.findById(id);
  if (!domain) return null;

  const providerClient = providerFactory(domain.provider || 'mock');

  // registrar cancellation
  await providerClient.cancelDomainWithAPI(domain.name);

  // soft delete
  await repo.softDelete(id);

  events.emitDomainDeleted(domain);

  return true;
}

module.exports = {
  getAllDomains,
  getDomainById,
  checkAvailability,
  whoisLookup,
  registerDomain,
  addDnsRecord,
  deleteDomain   
};
