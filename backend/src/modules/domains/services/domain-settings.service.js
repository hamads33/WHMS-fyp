/**
 * Domain Settings Service
 * Stores/retrieves registrar credentials in the DomainSetting table.
 * Sensitive fields (api_key, secret, password) are returned masked on GET
 * but written as plaintext. Upgrade to encrypted storage if needed.
 */

const prisma = require("../../../../prisma");

const SENSITIVE_KEYS = ["api_key", "secret_key", "api_secret", "password", "secret"];

const KNOWN_KEYS = {
  // Porkbun
  porkbun_api_key:    { category: "porkbun",   description: "Porkbun API key (pk1_...)" },
  porkbun_secret_key: { category: "porkbun",   description: "Porkbun secret API key (sk1_...)" },
  porkbun_enabled:    { category: "porkbun",   description: "Enable Porkbun registrar (true/false)" },

  // Namecheap
  namecheap_api_user:    { category: "namecheap", description: "Namecheap account username" },
  namecheap_api_key:     { category: "namecheap", description: "Namecheap API key" },
  namecheap_client_ip:   { category: "namecheap", description: "Whitelisted client IP for Namecheap API" },
  namecheap_sandbox:     { category: "namecheap", description: "Use sandbox environment (true/false)" },
  namecheap_enabled:     { category: "namecheap", description: "Enable Namecheap registrar (true/false)" },
};

function isSensitive(key) {
  return SENSITIVE_KEYS.some(s => key.toLowerCase().includes(s));
}

/**
 * Fetch all domain settings, grouped by category.
 * Sensitive values are masked.
 */
async function getSettings(category) {
  const where = category ? { category } : {};
  const rows = await prisma.domainSetting.findMany({ where });

  const out = {};
  for (const row of rows) {
    out[row.key] = isSensitive(row.key) && row.value
      ? "••••••••"
      : row.value;
  }
  return out;
}

/**
 * Fetch a single raw (unmasked) value by key.
 * Used internally by registrar credential loaders.
 */
async function getRawValue(key) {
  const row = await prisma.domainSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

/**
 * Set a key-value pair in DomainSetting.
 * Skip blank updates to avoid overwriting existing credentials with empty strings.
 */
async function setSetting(key, value, category, description) {
  // Don't overwrite with a masked placeholder
  if (value === "••••••••") return;

  const meta = KNOWN_KEYS[key] || {};
  await prisma.domainSetting.upsert({
    where: { key },
    create: {
      key,
      value:       String(value ?? ""),
      category:    category || meta.category || "general",
      description: description || meta.description || null,
    },
    update: {
      value:       String(value ?? ""),
      category:    category || meta.category || "general",
      description: description || meta.description || null,
    },
  });
}

/**
 * Load all settings for a given category as a plain { key: value } map (unmasked).
 * Used internally — never expose this directly to the client.
 */
async function getRawCategory(category) {
  const rows = await prisma.domainSetting.findMany({ where: { category } });
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

module.exports = { getSettings, getRawValue, setSetting, getRawCategory };
