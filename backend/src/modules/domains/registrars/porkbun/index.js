const axios = require("axios");
const https = require("https");
const { getRawCategory } = require("../../services/domain-settings.service");
const {
  createRegistrarError,
  normalizeRegistrarError,
} = require("../../utils/registrar-errors");
const { penniesToDollars } = require("../../utils/pennies");

const BASE_URL = "https://api.porkbun.com/api/json/v3";

const httpsAgent = new https.Agent({
  keepAlive: true,
  family: 4
});

async function getCredentials() {
  const db = await getRawCategory("porkbun");
  const apiKey   = db.porkbun_api_key   || process.env.PORKBUN_API_KEY;
  const secretKey = db.porkbun_secret_key || process.env.PORKBUN_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error(
      "Porkbun credentials not configured. " +
      "Add them in Admin → Settings → Domains or set PORKBUN_API_KEY / PORKBUN_SECRET_KEY."
    );
  }

  return { apikey: apiKey, secretapikey: secretKey };
}

async function porkbunRequest(endpoint, payload = {}, method = "POST") {
  const creds = await getCredentials();

  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${endpoint}`,
      data: method === "POST" ? { ...creds, ...payload } : undefined,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "WHMS-DomainService/1.0"
      },
      httpsAgent,
      timeout: 15000
    });

    if (response.data?.status !== "SUCCESS") {
      throw createRegistrarError({
        registrar: "porkbun",
        code: response.data?.code || "PORKBUN_API_ERROR",
        message: response.data?.message || "Porkbun API failure",
        statusCode: 400,
      });
    }

    return response.data;

  } catch (err) {
    if (err.response?.data) {
      throw normalizeRegistrarError(createRegistrarError({
        registrar: "porkbun",
        code: err.response.data?.code || "PORKBUN_HTTP_ERROR",
        message: err.response.data?.message || `Porkbun API error (${err.response.status})`,
        statusCode: err.response.status,
        cause: err,
      }), "porkbun");
    }
    throw normalizeRegistrarError(createRegistrarError({
      registrar: "porkbun",
      code: err.errorCode || err.code || "PORKBUN_NETWORK_ERROR",
      message: err.message || "Porkbun network error",
      statusCode: err.statusCode || 502,
      cause: err,
    }), "porkbun");
  }
}

const CAPABILITIES = {
  canManageDNS: true,
  canManageGlue: true,
  canForwardURL: true,
  canManageSSL: true,
  canSyncDomain: true,
  canPriceCheck: true,
};

function getCapabilities() {
  return { ...CAPABILITIES };
}

module.exports = {
  // Domain operations
  async checkAvailability(domain) {
    const data = await porkbunRequest(`/domain/checkDomain/${domain}`);
    const result = data.response;
    return {
      domain,
      available: result.avail === "yes",
      premium: result.premium === "yes",
      price: result.price ? parseFloat(result.price) : null,
      regularPrice: result.regularPrice ? parseFloat(result.regularPrice) : null,
      minDuration: result.minDuration
    };
  },

  async registerDomain({ domain, years, nameservers = [] }) {
    throw new Error("Domain registration not available via Porkbun API");
  },

  async renewDomain({ domain, years }) {
    throw new Error("Domain renewal not available via Porkbun API");
  },

  async transferDomain({ domain, authCode, cost }) {
    const normalizedCost =
      cost === null || cost === undefined
        ? undefined
        : penniesToDollars(cost).toFixed(2);

    const data = await porkbunRequest(`/domain/transfer/${domain}`, {
      authCode,
      cost: normalizedCost
    });
    return {
      domain: data.domain,
      orderId: data.orderId,
      transferId: data.transferId,
      balance: data.balance
    };
  },

  async getTransferStatus(domain) {
    const data = await porkbunRequest(`/domain/getTransfer/${domain}`);
    return data.transfer;
  },

  async listTransfers() {
    const data = await porkbunRequest(`/domain/listTransfers`);
    return data.transfers || [];
  },

  async updateNameservers({ domain, nameservers }) {
    await porkbunRequest(`/domain/updateNs/${domain}`, { ns: nameservers });
    return { success: true };
  },

  async getNameservers(domain) {
    const data = await porkbunRequest(`/domain/getNs/${domain}`);
    return { success: true, nameservers: data.ns || [] };
  },

  async listDomains(includeLabels = false) {
    const domains = [];
    let start = 0;
    let hasMore = true;

    while (hasMore) {
      const data = await porkbunRequest("/domain/listAll", {
        start,
        includeLabels: includeLabels ? "yes" : "no"
      });

      if (data.domains?.length > 0) {
        domains.push(...data.domains);
        start += 1000;
        if (data.domains.length < 1000) hasMore = false;
      } else {
        hasMore = false;
      }
    }

    return {
      success: true,
      domains: domains.map(d => ({
        domain: d.domain,
        status: d.status === "ACTIVE" ? "active" : "expired",
        expiryDate: new Date(d.expireDate),
        createDate: new Date(d.createDate),
        autoRenew: Boolean(d.autoRenew),
        locked: Boolean(d.securityLock),
        whoisPrivacy: Boolean(d.whoisPrivacy),
        tld: d.tld,
        labels: d.labels || []
      }))
    };
  },

  async syncDomain(domain) {
    const { domains } = await porkbunRequest("/domain/listAll");
    const domainInfo = domains?.find(d => d.domain === domain);

    if (!domainInfo) throw new Error(`Domain ${domain} not found`);

    return {
      status: domainInfo.status === "ACTIVE" ? "active" : "expired",
      expiryDate: new Date(domainInfo.expireDate),
      createDate: new Date(domainInfo.createDate),
      autoRenew: Boolean(domainInfo.autoRenew),
      locked: Boolean(domainInfo.securityLock),
      whoisPrivacy: Boolean(domainInfo.whoisPrivacy)
    };
  },

  async updateAutoRenew(domains, status) {
    const data = await porkbunRequest(`/domain/updateAutoRenew/`, {
      status: status ? "on" : "off",
      domains
    });
    return data.results || {};
  },

  // Glue records
  async getGlueRecords(domain) {
    const data = await porkbunRequest(`/domain/getGlue/${domain}`);
    return {
      hosts: data.hosts?.map(([hostname, ips]) => ({
        hostname,
        subdomain: hostname.replace(new RegExp(`\\.${domain.replace(/\./g, "\\.")}$`), ""),
        ipv4: ips.v4 || [],
        ipv6: ips.v6 || []
      })) || []
    };
  },

  async createGlueRecord(domain, subdomain, ips) {
    await porkbunRequest(`/domain/createGlue/${domain}/${subdomain}`, { ips });
    return { success: true };
  },

  async updateGlueRecord(domain, subdomain, ips) {
    await porkbunRequest(`/domain/updateGlue/${domain}/${subdomain}`, { ips });
    return { success: true };
  },

  async deleteGlueRecord(domain, subdomain) {
    await porkbunRequest(`/domain/deleteGlue/${domain}/${subdomain}`);
    return { success: true };
  },

  // URL Forwarding
  async getUrlForwards(domain) {
    const data = await porkbunRequest(`/domain/getUrlForwarding/${domain}`);
    return data.forwards || [];
  },

  async addUrlForward(domain, { subdomain, location, type, includePath, wildcard }) {
    await porkbunRequest(`/domain/addUrlForward/${domain}`, {
      subdomain: subdomain || "",
      location,
      type,
      includePath,
      wildcard
    });
    return { success: true };
  },

  async deleteUrlForward(domain, id) {
    await porkbunRequest(`/domain/deleteUrlForward/${domain}/${id}`);
    return { success: true };
  },

  // DNS operations
  async getDnsRecords(domain) {
    const data = await porkbunRequest(`/dns/retrieve/${domain}`);
    return {
      cloudflare: data.cloudflare,
      records: data.records?.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        content: r.content,
        ttl: parseInt(r.ttl) || 600,
        priority: r.prio ? parseInt(r.prio) : null,
        notes: r.notes
      })) || []
    };
  },

  async getDnsRecordById(domain, id) {
    const data = await porkbunRequest(`/dns/retrieve/${domain}/${id}`);
    return data.records || [];
  },

  async getDnsRecordsByType(domain, type, subdomain = "") {
    const name = subdomain || "";
    const data = await porkbunRequest(`/dns/retrieveByNameType/${domain}/${type}/${name}`);
    return data.records || [];
  },

  async createDnsRecord(domain, { type, name, content, ttl = 600, priority = 0, notes = "" }) {
    const data = await porkbunRequest(`/dns/create/${domain}`, {
      type,
      name: name || "",
      content,
      ttl,
      prio: priority,
      notes
    });
    return { id: data.id, success: true };
  },

  async editDnsRecord(domain, id, { type, name, content, ttl, priority, notes }) {
    await porkbunRequest(`/dns/edit/${domain}/${id}`, {
      type,
      name: name || "",
      content,
      ttl: ttl || 0,
      prio: priority || 0,
      notes
    });
    return { success: true };
  },

  async editDnsRecordsByType(domain, type, subdomain, { content, ttl, priority, notes }) {
    const name = subdomain || "";
    await porkbunRequest(`/dns/editByNameType/${domain}/${type}/${name}`, {
      content,
      ttl: ttl || 0,
      prio: priority || 0,
      notes
    });
    return { success: true };
  },

  async deleteDnsRecord(domain, id) {
    await porkbunRequest(`/dns/delete/${domain}/${id}`);
    return { success: true };
  },

  async deleteDnsRecordsByType(domain, type, subdomain = "") {
    const name = subdomain || "";
    await porkbunRequest(`/dns/deleteByNameType/${domain}/${type}/${name}`);
    return { success: true };
  },

  // DNSSEC
  async getDnssecRecords(domain) {
    const data = await porkbunRequest(`/dns/getDnssecRecords/${domain}`);
    return data.records || {};
  },

  async createDnssecRecord(domain, { keyTag, alg, digestType, digest, ...rest }) {
    await porkbunRequest(`/dns/createDnssecRecord/${domain}`, {
      keyTag,
      alg,
      digestType,
      digest,
      ...rest
    });
    return { success: true };
  },

  async deleteDnssecRecord(domain, keyTag) {
    await porkbunRequest(`/dns/deleteDnssecRecord/${domain}/${keyTag}`);
    return { success: true };
  },

  // SSL
  async getSSLCertificate(domain) {
    const data = await porkbunRequest(`/ssl/retrieve/${domain}`);
    return {
      certificateChain: data.certificatechain,
      privateKey: data.privatekey,
      publicKey: data.publickey
    };
  },

  // Account
  async getBalance() {
    const data = await porkbunRequest(`/account/balance`);
    return {
      balance: data.balance,
      display: data.display
    };
  },

  async createAccountInvite(email, returnUrl) {
    const data = await porkbunRequest(`/account/invite`, { email, returnUrl });
    return {
      inviteToken: data.inviteToken,
      inviteUrl: data.inviteUrl,
      expires: data.expires
    };
  },

  async checkInviteStatus(token) {
    const data = await porkbunRequest(`/account/inviteStatus`, { token });
    return {
      status: data.inviteStatus,
      newAccountId: data.newAccountId
    };
  },

  // Pricing
  async getPricing(tlds = []) {
    const data = await porkbunRequest(`/pricing/get`, {
      tlds: tlds.length > 0 ? tlds : undefined
    });
    return data.pricing || {};
  },

  async getDNS({ domain }) {
    return this.getDnsRecords(domain);
  },

  async updateDNS({ domain, action, recordId, record }) {
    if (action === "create") {
      return this.createDnsRecord(domain, record);
    }

    if (action === "update") {
      return this.editDnsRecord(domain, recordId, record);
    }

    if (action === "delete") {
      return this.deleteDnsRecord(domain, recordId);
    }

    throw createRegistrarError({
      registrar: "porkbun",
      code: "INVALID_DNS_ACTION",
      message: `Unsupported DNS action: ${action}`,
      statusCode: 400,
    });
  },

  async getGlue({ domain }) {
    return this.getGlueRecords(domain);
  },

  async updateGlue({ domain, action, subdomain, ips }) {
    if (action === "create") {
      return this.createGlueRecord(domain, subdomain, ips);
    }

    if (action === "update") {
      return this.updateGlueRecord(domain, subdomain, ips);
    }

    if (action === "delete") {
      return this.deleteGlueRecord(domain, subdomain);
    }

    throw createRegistrarError({
      registrar: "porkbun",
      code: "INVALID_GLUE_ACTION",
      message: `Unsupported glue action: ${action}`,
      statusCode: 400,
    });
  },

  async getForwarding({ domain }) {
    return this.getUrlForwards(domain);
  },

  async updateForwarding({ domain, action, forwardId, forward }) {
    if (action === "create") {
      return this.addUrlForward(domain, forward);
    }

    if (action === "delete") {
      return this.deleteUrlForward(domain, forwardId);
    }

    throw createRegistrarError({
      registrar: "porkbun",
      code: "INVALID_FORWARDING_ACTION",
      message: `Unsupported forwarding action: ${action}`,
      statusCode: 400,
    });
  },

  async getSSL({ domain }) {
    return this.getSSLCertificate(domain);
  },

  async sync({ domain }) {
    return this.syncDomain(domain);
  },

  getCapabilities,

  // Marketplace
  async getMarketplaceListings(start = 0, limit = 1000) {
    const data = await porkbunRequest(`/marketplace/getAll`, { start, limit });
    return {
      count: data.count,
      domains: data.domains || []
    };
  },

  // Utility
  async ping() {
    const data = await porkbunRequest(`/ping`);
    return {
      ip: data.yourIp,
      credentialsValid: data.credentialsValid || false
    };
  },

  async getIP() {
    const data = await porkbunRequest(`/ip`, {});
    return { ip: data.yourIp };
  },

  // Email hosting
  async setEmailPassword(emailAddress, password) {
    await porkbunRequest(`/email/setPassword`, { emailAddress, password });
    return { success: true };
  },

  // Helper
  async updateDNSRecords() {
    return { success: true, synced: true };
  },

  async hasCredentials() {
    try {
      const db = await getRawCategory("porkbun");
      const apiKey = db.porkbun_api_key || process.env.PORKBUN_API_KEY;
      const secretKey = db.porkbun_secret_key || process.env.PORKBUN_SECRET_KEY;
      return !!(apiKey && secretKey);
    } catch {
      return false;
    }
  }
};
