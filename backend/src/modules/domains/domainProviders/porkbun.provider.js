// src/modules/domains/providers/porkbun.provider.js
const API_HOST = process.env.PORKBUN_API_HOST || "https://api.porkbun.com/api/json/v3";
const API_KEY = process.env.PORKBUN_API_KEY;
const SECRET_KEY = process.env.PORKBUN_SECRET_API_KEY;

if (!API_KEY || !SECRET_KEY) {
  console.warn("⚠️ Porkbun credentials missing (PORKBUN_API_KEY / PORKBUN_SECRET_API_KEY).");
}

async function porkbunRequest(path, body = {}, method = "POST") {
  const url = `${API_HOST}${path}`;
  const payload = {
    apikey: API_KEY,
    secretapikey: SECRET_KEY,
    ...body,
  };

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({ status: "ERROR", message: "Invalid JSON" }));

  return json;
}

/**
 * Domain check availability
 * path: /domain/checkDomain/DOMAIN
 * returns Porkbun response (status/response/limits)
 */
async function checkDomain(domain) {
  const path = `/domain/checkDomain/${encodeURIComponent(domain)}`;
  return await porkbunRequest(path, {});
}

/**
 * Get default Pricing (no auth required according to docs)
 * endpoint: /domain/getPricing
 */
async function getPricing() {
  const path = `/domain/getPricing`;
  // docs indicate this requires no auth but their page uses POST JSON; keep apikey fields (no harm)
  return await porkbunRequest(path, {});
}

/**
 * List domains owned on account
 * endpoint: /domain/listAll
 */
async function listDomains() {
  const path = `/domain/listAll`;
  return await porkbunRequest(path, {});
}

/**
 * Get nameservers for a domain
 * endpoint: /domain/listNameServers/DOMAIN
 */
async function getNameservers(domain) {
  const path = `/domain/listNameServers/${encodeURIComponent(domain)}`;
  return await porkbunRequest(path, {});
}

/**
 * Update nameservers
 * endpoint: /domain/updateNameServers/DOMAIN
 * body: { nameservers: ["ns1.example.com","ns2..."] }
 */
async function updateNameservers(domain, nameservers = []) {
  const path = `/domain/updateNameServers/${encodeURIComponent(domain)}`;
  return await porkbunRequest(path, { nameservers });
}

/**
 * Register domain (create)
 * endpoint: /domain/create
 * payload per docs: domain, years, registrantContact (various fields)
 */
async function registerDomain(domain, years = 1, contact = {}) {
  const path = `/domain/create`;
  const body = {
    domain,
    years: String(years),
    ... (contact ? { registrantContact: contact } : {}),
  };
  return await porkbunRequest(path, body);
}

/**
 * DNS functions
 * Retrieve records: /dns/retrieve/DOMAIN
 * Create record: /dns/create/DOMAIN
 * Edit record by ID: /dns/editByDomainAndID/DOMAIN/ID
 * Delete record by ID: /dns/deleteByDomainAndID/DOMAIN/ID
 */

async function dnsRetrieve(domain) {
  const path = `/dns/retrieve/${encodeURIComponent(domain)}`;
  return await porkbunRequest(path, {});
}

async function dnsCreate(domain, record) {
  // record example: { type: "A", name: "www", content: "1.2.3.4", ttl: 3600 }
  const path = `/dns/create/${encodeURIComponent(domain)}`;
  return await porkbunRequest(path, record);
}

async function dnsEditById(domain, id, record) {
  const path = `/dns/editByDomainAndID/${encodeURIComponent(domain)}/${encodeURIComponent(id)}`;
  return await porkbunRequest(path, record);
}

async function dnsDeleteById(domain, id) {
  const path = `/dns/deleteByDomainAndID/${encodeURIComponent(domain)}/${encodeURIComponent(id)}`;
  return await porkbunRequest(path, {});
}

module.exports = {
  checkDomain,
  getPricing,
  listDomains,
  getNameservers,
  updateNameservers,
  registerDomain,
  dnsRetrieve,
  dnsCreate,
  dnsEditById,
  dnsDeleteById,
};
