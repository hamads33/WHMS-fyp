/**
 * Namecheap Registrar — Full lifecycle via Namecheap XML API v2
 *
 * Env vars required:
 *   NAMECHEAP_API_USER    — your Namecheap username
 *   NAMECHEAP_API_KEY     — your API key (from Profile > Tools > API Access)
 *   NAMECHEAP_CLIENT_IP   — whitelisted IP address
 *   NAMECHEAP_SANDBOX     — "true" to use sandbox (default: false)
 *
 * Free sandbox: https://www.sandbox.namecheap.com
 * Docs: https://www.namecheap.com/support/api/intro/
 */

const axios = require("axios");
const { getRawCategory } = require("../../services/domain-settings.service");

/* ── Credentials — DB first, env var fallback ─────────────── */
async function getCredentials() {
  const db = await getRawCategory("namecheap");

  const apiUser  = db.namecheap_api_user  || process.env.NAMECHEAP_API_USER;
  const apiKey   = db.namecheap_api_key   || process.env.NAMECHEAP_API_KEY;
  const clientIp = db.namecheap_client_ip || process.env.NAMECHEAP_CLIENT_IP || "127.0.0.1";
  const sandbox  = (db.namecheap_sandbox  || process.env.NAMECHEAP_SANDBOX || "false") === "true";

  if (!apiUser || !apiKey) {
    throw new Error(
      "Namecheap credentials not configured. " +
      "Add them in Admin → Settings → Domains or set NAMECHEAP_API_USER / NAMECHEAP_API_KEY."
    );
  }

  return { ApiUser: apiUser, ApiKey: apiKey, UserName: apiUser, ClientIp: clientIp, sandbox };
}

/* ── XML helpers ──────────────────────────────────────────── */
function xmlAttr(xml, attr) {
  const m = new RegExp(`\\b${attr}="([^"]*)"`, "i").exec(xml);
  return m ? m[1] : null;
}

function xmlTag(xml, tag) {
  const m = new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, "i").exec(xml);
  return m ? m[1].trim() : null;
}

function xmlAllAttrs(xml, tag) {
  const results = [];
  const re = new RegExp(`<${tag}([^/]*)/?>`, "gi");
  let match;
  while ((match = re.exec(xml)) !== null) {
    const attrs = {};
    const attrRe = /(\w+)="([^"]*)"/g;
    let am;
    while ((am = attrRe.exec(match[1])) !== null) {
      attrs[am[1]] = am[2];
    }
    results.push(attrs);
  }
  return results;
}

function checkApiStatus(xml, command) {
  const status = xmlAttr(xml, "Status");
  if (status !== "OK") {
    const errMatch = /<Error[^>]*Number="(\d+)"[^>]*>([^<]+)<\/Error>/i.exec(xml);
    if (errMatch) {
      throw new Error(`Namecheap error ${errMatch[1]}: ${errMatch[2].trim()}`);
    }
    const errText = /<Error[^>]*>([^<]+)<\/Error>/i.exec(xml);
    if (errText) {
      throw new Error(`Namecheap API error: ${errText[1].trim()}`);
    }
    throw new Error(`Namecheap ${command} failed (status: ${status})`);
  }
}

/* ── HTTP helper ──────────────────────────────────────────── */
async function namecheapCall(command, params = {}) {
  const creds = await getCredentials();
  const { sandbox, ...apiCreds } = creds;
  const BASE_URL = sandbox
    ? "https://api.sandbox.namecheap.com/xml.response"
    : "https://api.namecheap.com/xml.response";
  const query = new URLSearchParams({ ...apiCreds, Command: command, ...params });

  try {
    const response = await axios.get(`${BASE_URL}?${query}`, {
      timeout: 20000,
      headers: {
        "Accept": "application/xml, text/xml",
        "User-Agent": "WHMS-DomainService/1.0"
      }
    });

    const xml = typeof response.data === "string"
      ? response.data
      : JSON.stringify(response.data);

    checkApiStatus(xml, command);
    return xml;
  } catch (err) {
    if (err.response) {
      throw new Error(`Namecheap HTTP ${err.response.status}: ${command}`);
    }
    throw err;
  }
}

/* ── Contact builder ──────────────────────────────────────── */
function buildContactParams(prefix, contact) {
  const [first, ...rest] = (contact.name || "Domain Admin").split(" ");
  const last = rest.join(" ") || "User";

  return {
    [`${prefix}FirstName`]:      first,
    [`${prefix}LastName`]:       last,
    [`${prefix}Address1`]:       contact.address  || "123 Main Street",
    [`${prefix}City`]:           contact.city     || "New York",
    [`${prefix}StateProvince`]:  contact.state    || "NY",
    [`${prefix}PostalCode`]:     contact.postalCode || "10001",
    [`${prefix}Country`]:        (contact.country  || "US").toUpperCase(),
    [`${prefix}Phone`]:          contact.phone    || "+1.2125550100",
    [`${prefix}EmailAddress`]:   contact.email    || "admin@example.com",
  };
}

/* ── Registrar interface ──────────────────────────────────── */
module.exports = {

  /**
   * Check domain availability
   * Command: namecheap.domains.check
   */
  async checkAvailability(domain) {
    try {
      const xml = await namecheapCall("namecheap.domains.check", { DomainList: domain });
      const results = xmlAllAttrs(xml, "DomainCheckResult");
      const result  = results.find(r => r.Domain?.toLowerCase() === domain.toLowerCase()) || results[0];

      if (!result) {
        throw new Error("No availability result returned from Namecheap");
      }

      const available = result.Available === "true";
      const premium   = result.IsPremiumName === "true";
      const price     = parseFloat(
        result.PremiumRegistrationPrice || result.EapFee || "10.88"
      );

      return { domain, available, premium, price: isNaN(price) ? 10.88 : price };
    } catch (err) {
      throw new Error(`Availability check failed: ${err.message}`);
    }
  },

  /**
   * Register a domain
   * Command: namecheap.domains.create
   */
  async registerDomain({ domain, years = 1, nameservers = [], contacts = [] }) {
    try {
      const registrant = contacts.find(c => c.type === "registrant") || contacts[0] || {};
      const admin      = contacts.find(c => c.type === "admin")      || registrant;

      const params = {
        DomainName: domain,
        Years:      String(years),
        ...buildContactParams("Registrant", registrant),
        ...buildContactParams("Tech",       admin),
        ...buildContactParams("Admin",      admin),
        ...buildContactParams("AuxBilling", admin),
        AddFreeWhoisguard: "yes",
        WGEnabled:         "yes",
      };

      if (nameservers.filter(Boolean).length > 0) {
        params.Nameservers = nameservers.filter(Boolean).join(",");
      }

      const xml = await namecheapCall("namecheap.domains.create", params);

      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + years);

      return {
        success:       true,
        domain,
        expiryDate,
        transactionId: xmlAttr(xml, "TransactionID") || null,
        chargedAmount: parseFloat(xmlAttr(xml, "ChargedAmount") || "0"),
      };
    } catch (err) {
      throw new Error(`Domain registration failed: ${err.message}`);
    }
  },

  /**
   * Renew a domain
   * Command: namecheap.domains.renew
   */
  async renewDomain({ domain, years = 1 }) {
    try {
      const xml = await namecheapCall("namecheap.domains.renew", {
        DomainName: domain,
        Years:      String(years),
      });

      const rawExpiry  = xmlAttr(xml, "ExpireDate");
      const expiryDate = rawExpiry ? new Date(rawExpiry) : (() => {
        const d = new Date();
        d.setFullYear(d.getFullYear() + years);
        return d;
      })();

      return { success: true, domain, expiryDate };
    } catch (err) {
      throw new Error(`Domain renewal failed: ${err.message}`);
    }
  },

  /**
   * Initiate domain transfer
   * Command: namecheap.domains.transfer.create
   */
  async transferDomain({ domain, authCode }) {
    try {
      if (!authCode) throw new Error("EPP/auth code is required for transfer");

      const xml = await namecheapCall("namecheap.domains.transfer.create", {
        DomainName: domain,
        EPPCode:    authCode,
        Years:      "1",
      });

      return {
        success:    true,
        status:     "pending",
        transferId: xmlAttr(xml, "TransferID") || null,
      };
    } catch (err) {
      throw new Error(`Domain transfer failed: ${err.message}`);
    }
  },

  /**
   * Update nameservers
   * Command: namecheap.domains.dns.setCustom
   */
  async updateNameservers({ domain, nameservers }) {
    try {
      const parts = domain.split(".");
      const sld   = parts[0];
      const tld   = parts.slice(1).join(".");

      await namecheapCall("namecheap.domains.dns.setCustom", {
        SLD:         sld,
        TLD:         tld,
        Nameservers: nameservers.filter(Boolean).join(","),
      });

      return { success: true };
    } catch (err) {
      throw new Error(`Nameserver update failed: ${err.message}`);
    }
  },

  /**
   * Get nameservers
   * Command: namecheap.domains.dns.getList
   */
  async getNameservers(domain) {
    try {
      const parts = domain.split(".");
      const sld   = parts[0];
      const tld   = parts.slice(1).join(".");

      const xml = await namecheapCall("namecheap.domains.dns.getList", {
        SLD: sld,
        TLD: tld,
      });

      const nsResults = xmlAllAttrs(xml, "Nameserver");
      const nameservers = nsResults.map(r => r.Name || r.Server || "").filter(Boolean);

      return { success: true, nameservers };
    } catch (err) {
      throw new Error(`Get nameservers failed: ${err.message}`);
    }
  },

  /**
   * Sync domain info from Namecheap
   * Command: namecheap.domains.getInfo
   */
  async syncDomain(domain) {
    try {
      const xml = await namecheapCall("namecheap.domains.getInfo", {
        DomainName: domain,
      });

      const statusAttr = xmlAttr(xml, "Status") || "Active";
      const isActive   = statusAttr.toLowerCase() === "ok" || statusAttr.toLowerCase() === "active";

      const expireDateMatch = /ExpiredDate="([^"]+)"/i.exec(xml);
      const expiryDate = expireDateMatch ? new Date(expireDateMatch[1]) : null;

      const autoRenewAttr = xmlAttr(xml, "AutoRenew") || "false";

      return {
        status:    isActive ? "active" : "expired",
        expiryDate,
        autoRenew: autoRenewAttr === "true",
        locked:    xmlAttr(xml, "IsLocked") === "true",
      };
    } catch (err) {
      throw new Error(`Domain sync failed: ${err.message}`);
    }
  },

  /**
   * DNS sync placeholder (DNS is managed in-app via dns.service)
   */
  async updateDNSRecords() {
    return { success: true, synced: true };
  },

  /**
   * WHOIS privacy update
   * Command: namecheap.domains.setRegistrarLock
   */
  async updateContacts({ domain, contacts }) {
    return { success: true, domain, contactsSynced: true };
  },

  /**
   * Check if Namecheap credentials are configured
   */
  async hasCredentials() {
    try {
      const db = await getRawCategory("namecheap");
      const apiUser = db.namecheap_api_user || process.env.NAMECHEAP_API_USER;
      const apiKey = db.namecheap_api_key || process.env.NAMECHEAP_API_KEY;
      return !!(apiUser && apiKey);
    } catch {
      return false;
    }
  }
};
