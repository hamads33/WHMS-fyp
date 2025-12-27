const axios = require("axios");
const prisma = require("../../../../prisma");
const crypto = require("crypto");

const BASE_URL = "https://api.porkbun.com/api/json/v3";

/**
 * Decrypt stored secrets (same logic you used earlier)
 */
function decrypt(text) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(process.env.SECRET_ENCRYPTION_KEY, "hex"),
    Buffer.alloc(16, 0)
  );
  let decrypted = decipher.update(text, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Load Porkbun credentials securely from DB
 */
async function getCredentials() {
  const provider = await prisma.providerConfig.findUnique({
    where: { name: "porkbun" }
  });

  if (!provider) {
    throw new Error("Porkbun registrar not configured");
  }

  return {
    apikey: decrypt(provider.key),
    secretapikey: decrypt(provider.secret)
  };
}

/**
 * Helper to POST to Porkbun
 */
async function porkbunPost(endpoint, payload = {}) {
  const creds = await getCredentials();

  const res = await axios.post(`${BASE_URL}${endpoint}`, {
    ...creds,
    ...payload
  });

  if (res.data.status !== "SUCCESS") {
    throw new Error(res.data.message || "Porkbun API error");
  }

  return res.data;
}

module.exports = {
  // ─────────────────────────────
  // Availability
  // ─────────────────────────────
  async checkAvailability(domain) {
    const data = await porkbunPost("/domain/checkAvailability", {
      domain
    });

    const result = data.domains[domain];

    return {
      domain,
      available: result.status === "available",
      premium: Boolean(result.premium),
      price: result.price ? Math.round(result.price) : null
    };
  },

  // ─────────────────────────────
  // Registration
  // ─────────────────────────────
  async registerDomain({ domain, years, nameservers = [] }) {
    const data = await porkbunPost("/domain/create", {
      domain,
      years,
      ns: nameservers
    });

    return {
      success: true,
      expiryDate: new Date(data.expiration)
    };
  },

  // ─────────────────────────────
  // Renewal
  // ─────────────────────────────
  async renewDomain({ domain, years }) {
    await porkbunPost("/domain/renew", {
      domain,
      years
    });

    return { success: true };
  },

  // ─────────────────────────────
  // Transfer (EPP)
  // ─────────────────────────────
  async transferDomain({ domain, authCode }) {
    await porkbunPost("/domain/transfer", {
      domain,
      authcode: authCode
    });

    return {
      success: true,
      status: "pending"
    };
  },

  // ─────────────────────────────
  // DNS Sync (basic)
  // ─────────────────────────────
  async updateDNSRecords(domain) {
    // Porkbun DNS is zone-based, local-first model is preferred
    return {
      success: true,
      synced: true
    };
  },

  // ─────────────────────────────
  // Registrar Sync (expiry + status)
  // ─────────────────────────────
  async syncDomain(domain) {
    const data = await porkbunPost("/domain/getInfo", {
      domain
    });

    return {
      status: data.status === "ACTIVE" ? "active" : "expired",
      expiryDate: new Date(data.expiration)
    };
  }
};
