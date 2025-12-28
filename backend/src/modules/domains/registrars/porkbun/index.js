"use strict";

const axios = require("axios");
const prisma = require("../../../../../prisma");
const crypto = require("crypto");
const https = require("https");

/**
 * Porkbun API v3 base
 */
const BASE_URL = "https://api.porkbun.com/api/json/v3";

/**
 * Force IPv4 (recommended by Porkbun)
 */
const httpsAgent = new https.Agent({
  keepAlive: true,
  family: 4
});

/**
 * AES-256-GCM decrypt
 * Format: iv(12) + tag(16) + ciphertext
 */
function decrypt(encryptedHex) {
  const raw = Buffer.from(encryptedHex, "hex");

  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(process.env.SECRET_ENCRYPTION_KEY, "hex"),
    iv
  );

  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]).toString("utf8");
}

/**
 * Load Porkbun credentials from DB
 */
async function getCredentials() {
  const provider = await prisma.providerConfig.findUnique({
    where: { name: "porkbun" }
  });

  if (!provider || !provider.active) {
    throw new Error("Porkbun registrar is not active");
  }

  return {
    apikey: decrypt(provider.key),
    secretapikey: decrypt(provider.secret)
  };
}

/**
 * Unified POST helper
 */
async function porkbunPost(endpoint, payload = {}) {
  const creds = await getCredentials();

  try {
    const response = await axios.post(
      `${BASE_URL}${endpoint}`,
      {
        ...creds,
        ...payload
      },
      {
        httpsAgent,
        timeout: 15000,
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "User-Agent": "WHMS-DomainService/1.0"
        }
      }
    );

    if (response.data?.status !== "SUCCESS") {
      throw new Error(response.data?.message || "Porkbun API failure");
    }

    return response.data;

  } catch (err) {
    if (err.response) {
      throw new Error(
        `Porkbun API error (${err.response.status}): ${
          typeof err.response.data === "string"
            ? err.response.data
            : JSON.stringify(err.response.data)
        }`
      );
    }

    throw new Error(`Porkbun network error: ${err.code || err.message}`);
  }
}

/**
 * Registrar Interface (WHMS-compatible)
 */
module.exports = {

  /**
   * Check domain availability
   * Endpoint: /domain/checkDomain/{domain}
   */
  async checkAvailability(domain) {
    const data = await porkbunPost(`/domain/checkDomain/${domain}`);

    const result = data.response;
    if (!result) {
      throw new Error("Invalid availability response from Porkbun");
    }

    return {
      domain,
      available: result.avail === "yes",
      premium: result.premium === "yes",
      price: result.price ? parseFloat(result.price) : null,
      regularPrice: result.regularPrice ? parseFloat(result.regularPrice) : null
    };
  },

  /**
   * Register a domain
   * NOTE: Porkbun API v3 does NOT expose domain registration via API.
   * Domain registration must be done through the web interface.
   */
  async registerDomain({ domain, years, nameservers = [] }) {
    throw new Error(
      "Domain registration is not available via Porkbun API. " +
      "Please register domains through the Porkbun web interface at https://porkbun.com"
    );
  },

  /**
   * Renew a domain
   * NOTE: Porkbun API v3 does NOT expose domain renewal via API.
   * Domain renewal must be done through the web interface.
   */
  async renewDomain({ domain, years }) {
    throw new Error(
      "Domain renewal is not available via Porkbun API. " +
      "Please renew domains through the Porkbun web interface at https://porkbun.com/account"
    );
  },

  /**
   * Transfer a domain
   * NOTE: Porkbun API v3 does NOT expose domain transfer via API.
   * Domain transfers must be initiated through the web interface.
   */
  async transferDomain({ domain, authCode }) {
    throw new Error(
      "Domain transfer is not available via Porkbun API. " +
      "Please initiate transfers through the Porkbun web interface at https://porkbun.com/transfer"
    );
  },

  /**
   * Update nameservers for a domain
   * Endpoint: /domain/updateNs/{domain}
   */
  async updateNameservers({ domain, nameservers }) {
    await porkbunPost(`/domain/updateNs/${domain}`, {
      ns: nameservers
    });

    return { success: true };
  },

  /**
   * Get nameservers for a domain
   * Endpoint: /domain/getNs/{domain}
   */
  async getNameservers(domain) {
    const data = await porkbunPost(`/domain/getNs/${domain}`);

    return {
      success: true,
      nameservers: data.ns || []
    };
  },

  /**
   * DNS sync placeholder
   * (Actual DNS CRUD handled by dns.service)
   */
  async updateDNSRecords() {
    return { success: true, synced: true };
  },

  /**
   * Sync domain status from registrar
   * Uses domain list API to get domain info
   * Endpoint: /domain/listAll
   */
  async syncDomain(domain) {
    const data = await porkbunPost("/domain/listAll");

    const domainInfo = data.domains?.find(d => d.domain === domain);
    
    if (!domainInfo) {
      throw new Error(`Domain ${domain} not found in account`);
    }

    return {
      status: domainInfo.status === "ACTIVE" ? "active" : "expired",
      expiryDate: new Date(domainInfo.expireDate),
      autoRenew: Boolean(domainInfo.autoRenew),
      locked: Boolean(domainInfo.securityLock),
      whoisPrivacy: Boolean(domainInfo.whoisPrivacy)
    };
  },

  /**
   * Get all domains in account
   * Endpoint: /domain/listAll
   */
  async listDomains() {
    const domains = [];
    let start = 0;
    let hasMore = true;

    while (hasMore) {
      const data = await porkbunPost("/domain/listAll", { start });
      
      if (data.domains && data.domains.length > 0) {
        domains.push(...data.domains);
        start += 1000;
        
        // If we got less than 1000, we've reached the end
        if (data.domains.length < 1000) {
          hasMore = false;
        }
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
        whoisPrivacy: Boolean(d.whoisPrivacy)
      }))
    };
  }
};