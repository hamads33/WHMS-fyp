/**
 * WHOIS Lookup Service — powered by RDAP (Registration Data Access Protocol)
 *
 * RDAP is the modern, structured replacement for WHOIS. It is completely free,
 * requires no API key or credentials, and returns JSON (not plain text).
 *
 * Architecture:
 *   1. Determine TLD of the domain
 *   2. Query IANA RDAP bootstrap to find the authoritative RDAP server for that TLD
 *   3. Query the authoritative server for domain info
 *
 * Bootstrap cache: IANA's list is fetched once and cached in memory (1h TTL).
 */

const axios = require("axios");

/* ── Bootstrap cache ──────────────────────────────────────── */
let bootstrapCache   = null;
let bootstrapExpiry  = 0;
const BOOTSTRAP_TTL  = 60 * 60 * 1000; // 1 hour
const BOOTSTRAP_URL  = "https://data.iana.org/rdap/dns.json";

async function getBootstrap() {
  if (bootstrapCache && Date.now() < bootstrapExpiry) {
    return bootstrapCache;
  }

  try {
    const res = await axios.get(BOOTSTRAP_URL, {
      timeout: 10000,
      headers: { "User-Agent": "WHMS-DomainService/1.0" }
    });
    bootstrapCache  = res.data;
    bootstrapExpiry = Date.now() + BOOTSTRAP_TTL;
    return bootstrapCache;
  } catch {
    // Fall back to rdap.org universal proxy on bootstrap failure
    return null;
  }
}

/**
 * Find RDAP server URL for a given TLD from the IANA bootstrap registry
 */
async function findRdapServer(tld) {
  const bootstrap = await getBootstrap();
  if (!bootstrap?.services) return null;

  const normalised = tld.toLowerCase().replace(/^\./, "");

  for (const [tlds, servers] of bootstrap.services) {
    if (tlds.includes(normalised) && servers.length > 0) {
      return servers[0].replace(/\/$/, ""); // strip trailing slash
    }
  }
  return null;
}

/* ── RDAP query ───────────────────────────────────────────── */
async function queryRdap(domain) {
  const tld = domain.split(".").slice(1).join(".");
  const rdapBase = await findRdapServer(tld);

  const url = rdapBase
    ? `${rdapBase}/domain/${encodeURIComponent(domain)}`
    : `https://rdap.org/domain/${encodeURIComponent(domain)}`;

  const response = await axios.get(url, {
    timeout: 12000,
    maxRedirects: 5,
    headers: {
      "Accept": "application/rdap+json, application/json",
      "User-Agent": "WHMS-DomainService/1.0"
    }
  });

  return response.data;
}

/* ── RDAP response parser ─────────────────────────────────── */
function parseVcard(vcardArray) {
  if (!Array.isArray(vcardArray) || vcardArray.length < 2) return {};
  const props = vcardArray[1];
  const out = {};

  for (const prop of props) {
    const [name, , , value] = prop;
    if (!name || value == null) continue;

    if (name === "fn")    out.name  = value;
    if (name === "email") out.email = Array.isArray(value) ? value[0] : value;
    if (name === "org")   out.organization = Array.isArray(value) ? value[0] : value;
    if (name === "tel")   out.phone = Array.isArray(value) ? value[0] : value;

    if (name === "adr" && Array.isArray(value)) {
      // adr value is: [pobox, ext, street, city, region, postalCode, country]
      out.street     = value[2] || null;
      out.city       = value[3] || null;
      out.state      = value[4] || null;
      out.postalCode = value[5] || null;
      out.country    = value[6] || null;
    }
  }
  return out;
}

function parseEntity(entity) {
  const info = parseVcard(entity.vcardArray);
  const isRedacted = entity.remarks?.some(r =>
    /redact|privacy|gdpr/i.test(r.title || r.description?.join("") || "")
  ) || false;

  return { ...info, redacted: isRedacted, roles: entity.roles || [] };
}

function parseRdapResponse(data, domain) {
  const result = {
    domain:        domain,
    found:         true,

    // Dates
    registeredOn:  null,
    updatedOn:     null,
    expiresOn:     null,

    // Status (e.g. clientTransferProhibited)
    status:        [],

    // Registrar
    registrar:        null,
    registrarUrl:     null,
    registrarIanaId:  null,

    // Contacts
    registrant:    null,
    adminContact:  null,
    techContact:   null,

    // Nameservers
    nameservers:   [],

    // DNSSEC
    secureDns:     false,
  };

  // Events → dates
  for (const ev of (data.events || [])) {
    const iso = ev.eventDate ? new Date(ev.eventDate).toISOString() : null;
    if (ev.eventAction === "registration")  result.registeredOn = iso;
    if (ev.eventAction === "last changed")  result.updatedOn    = iso;
    if (ev.eventAction === "expiration")    result.expiresOn    = iso;
  }

  // Status array
  if (data.status) {
    result.status = Array.isArray(data.status) ? data.status : [data.status];
  }

  // Nameservers
  result.nameservers = (data.nameservers || [])
    .map(ns => (ns.ldhName || ns.unicodeName || "").toLowerCase())
    .filter(Boolean);

  // DNSSEC
  result.secureDns = data.secureDNS?.some?.(d => d.dsData || d.keyData) || false;

  // Entities (registrar + contacts)
  for (const entity of (data.entities || [])) {
    const roles = entity.roles || [];
    const info  = parseEntity(entity);

    if (roles.includes("registrar")) {
      result.registrar = info.name || null;
      result.registrarUrl = entity.links?.find(l => l.rel === "related")?.href || null;
      const ianaId = (entity.publicIds || []).find(p => p.type === "IANA Registrar ID");
      result.registrarIanaId = ianaId?.identifier || null;

      // Nested entities inside registrar (abuse contact etc.)
      for (const sub of (entity.entities || [])) {
        const subInfo = parseEntity(sub);
        if (sub.roles?.includes("abuse")) {
          result.abuseContact = subInfo;
        }
      }
    }

    if (roles.includes("registrant")) result.registrant   = info;
    if (roles.includes("administrative")) result.adminContact = info;
    if (roles.includes("technical"))   result.techContact  = info;
  }

  return result;
}

/* ── Public API ───────────────────────────────────────────── */

/**
 * Perform a WHOIS/RDAP lookup on any domain name.
 * Completely free — uses the public IANA RDAP infrastructure.
 *
 * @param {string} domain  e.g. "example.com"
 * @returns {object}  Structured WHOIS data
 */
async function lookupWhois(domain) {
  if (!domain || !domain.includes(".")) {
    throw new Error("Invalid domain name");
  }

  const normalised = domain.toLowerCase().trim().replace(/\.$/, "");

  try {
    const data   = await queryRdap(normalised);
    return parseRdapResponse(data, normalised);
  } catch (err) {
    if (err.response?.status === 404) {
      return {
        domain:    normalised,
        found:     false,
        available: true,
        message:   "Domain not registered or RDAP data not available for this TLD",
      };
    }

    if (err.response?.status === 429) {
      throw new Error("WHOIS rate limit reached. Please try again in a moment.");
    }

    throw new Error(`WHOIS lookup failed: ${err.message}`);
  }
}

module.exports = { lookupWhois };
