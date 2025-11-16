// src/modules/domains/providers/porkbun.provider.js

const API_HOST =
  process.env.PORKBUN_API_ENDPOINT ||
  "https://api.porkbun.com/api/json/v3";

const API_KEY = process.env.PORKBUN_API_KEY;
const SECRET_KEY = process.env.PORKBUN_SECRET_API_KEY;

if (!API_KEY || !SECRET_KEY) {
  console.warn("⚠️ Porkbun API credentials missing.");
}

// ------------------------------------------------------
// Helper: Auth block
// ------------------------------------------------------
function auth() {
  return {
    apikey: API_KEY,
    secretapikey: SECRET_KEY,
  };
}

// ------------------------------------------------------
// Helper: Generic POST wrapper
// ------------------------------------------------------
async function porkbunPOST(path, body = {}) {
  try {
    const url = `${API_HOST}${path}`;

    const payload = {
      ...auth(),
      ...body,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return await res.json();
  } catch (err) {
    return { status: "ERROR", message: err.message };
  }
}

// =====================================================================
//  ✔ 1. CHECK DOMAIN AVAILABILITY (REAL ENDPOINT)
// =====================================================================
// POST /domain/checkDomain/{domain}
async function checkDomain(domain) {
  return porkbunPOST(`/domain/checkDomain/${encodeURIComponent(domain)}`);
}

// =====================================================================
//  ✔ 2. REGISTER DOMAIN  (REAL ENDPOINT)
// =====================================================================
// POST /domain/create
async function registerDomain(domain, years = 1, contact = {}) {
  return porkbunPOST(`/domain/create`, {
    domain,
    years: String(years),

    // Porkbun expects all contact types, but they may reuse same info
    registrant: contact,
    tech: contact,
    admin: contact,
    billing: contact,
  });
}

// =====================================================================
//  ✔ 3. LIST DOMAINS (REAL ENDPOINT)
// =====================================================================
// POST /domain/listAll
async function listDomains() {
  return porkbunPOST(`/domain/listAll`);
}

// =====================================================================
//  ✔ 4. GET NAMESERVERS (REAL ENDPOINT)
// =====================================================================
// POST /domain/listNameServers/{domain}
async function getNameservers(domain) {
  return porkbunPOST(`/domain/listNameServers/${encodeURIComponent(domain)}`);
}

// =====================================================================
//  ✔ 5. UPDATE NAMESERVERS (REAL ENDPOINT)
// =====================================================================
// POST /domain/updateNameServers/{domain}
async function updateNameservers(domain, nameservers = []) {
  return porkbunPOST(
    `/domain/updateNameServers/${encodeURIComponent(domain)}`,
    { nameservers }
  );
}

// =====================================================================
//  ✔ 6. DNS — RETRIEVE RECORDS (REAL ENDPOINT)
// =====================================================================
// POST /dns/retrieve/{domain}
async function dnsRetrieve(domain) {
  return porkbunPOST(`/dns/retrieve/${encodeURIComponent(domain)}`);
}

// =====================================================================
//  ✔ 7. DNS — CREATE RECORD (REAL ENDPOINT)
// =====================================================================
// POST /dns/create/{domain}
async function dnsCreate(domain, record) {
  return porkbunPOST(`/dns/create/${encodeURIComponent(domain)}`, {
    name: record.name,
    type: record.type,
    content: record.value,
    ttl: record.ttl || 3600,
  });
}

// =====================================================================
//  ✔ 8. DNS — EDIT RECORD BY ID (REAL ENDPOINT)
// =====================================================================
// POST /dns/editByDomainAndID/{domain}/{id}
async function dnsEditById(domain, id, record) {
  return porkbunPOST(
    `/dns/editByDomainAndID/${encodeURIComponent(domain)}/${encodeURIComponent(id)}`,
    {
      name: record.name,
      type: record.type,
      content: record.value,
      ttl: record.ttl || 3600,
    }
  );
}

// =====================================================================
//  ✔ 9. DNS — DELETE RECORD BY ID (REAL ENDPOINT)
// =====================================================================
// POST /dns/deleteByDomainAndID/{domain}/{id}
async function dnsDeleteById(domain, id) {
  return porkbunPOST(
    `/dns/deleteByDomainAndID/${encodeURIComponent(domain)}/${encodeURIComponent(id)}`
  );
}

// =====================================================================
//  ✔ 10. GET PRICING (REAL ENDPOINT, NO AUTH REQUIRED)
// =====================================================================
// GET /domain/getPricing
async function getPricing() {
  try {
    const url = `${API_HOST}/pricing/get`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "WHMS/1.0"     // REQUIRED!
      }
    });

    const json = await res.json();
    return json;

  } catch (err) {
    return { status: "ERROR", message: err.message };
  }
}


// ------------------------------------------------------
module.exports = {
  checkDomain,
  registerDomain,
  listDomains,
  getNameservers,
  updateNameservers,
  dnsRetrieve,
  dnsCreate,
  dnsEditById,
  dnsDeleteById,
  getPricing,
};
