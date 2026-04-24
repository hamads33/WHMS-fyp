/**
 * plugin-marketplace.validation.js
 * ------------------------------------------------------------------
 * Input validation helpers.
 * Returns { valid: true } or { valid: false, errors: [...] }
 */

const { SUPPORTED_CAPABILITIES } = require("../../core/plugin-system/plugin.interface");

function sanitizeStringArray(value) {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return null;
}

function validateUiConfig(ui, errors, path = "ui") {
  if (ui === undefined || ui === null) return;
  if (typeof ui !== "object" || Array.isArray(ui)) {
    errors.push(`${path} must be an object`);
    return;
  }

  if (ui.adminPages !== undefined) {
    if (!Array.isArray(ui.adminPages)) {
      errors.push(`${path}.adminPages must be an array`);
      return;
    }

    for (const [index, page] of ui.adminPages.entries()) {
      if (!page || typeof page !== "object" || Array.isArray(page)) {
        errors.push(`${path}.adminPages[${index}] must be an object`);
        continue;
      }
      if (!page.id || typeof page.id !== "string") {
        errors.push(`${path}.adminPages[${index}].id is required`);
      }
      if (!page.label || typeof page.label !== "string") {
        errors.push(`${path}.adminPages[${index}].label is required`);
      }
    }
  }
}

function validatePluginDependencies(value, errors) {
  if (value === undefined || value === null) return;
  if (typeof value !== "object" || Array.isArray(value)) {
    errors.push("pluginDependencies must be an object");
    return;
  }

  for (const [name, range] of Object.entries(value)) {
    if (!name.trim()) {
      errors.push("pluginDependencies keys must be non-empty strings");
    }
    if (typeof range !== "string" || !range.trim()) {
      errors.push(`pluginDependencies.${name} must be a non-empty semver range string`);
    }
  }
}

function validatePluginMetadata(data, { partial = false } = {}) {
  const errors = [];

  if (!partial || data.name !== undefined) {
    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      errors.push("name is required");
    }
  }

  if (!partial || data.slug !== undefined) {
    if (!data.slug || typeof data.slug !== "string" || !data.slug.trim()) {
      errors.push("slug is required");
    } else if (!/^[a-z0-9-]+$/.test(data.slug.trim())) {
      errors.push("slug must be lowercase letters, numbers, and hyphens only");
    }
  }

  if (data.author !== undefined && data.author !== null && typeof data.author !== "string") {
    errors.push("author must be a string");
  }

  const capabilities = sanitizeStringArray(data.capabilities);
  if (data.capabilities !== undefined) {
    if (!capabilities) {
      errors.push("capabilities must be an array or comma-separated string");
    } else {
      const unsupported = capabilities.filter((cap) => !SUPPORTED_CAPABILITIES.includes(cap));
      if (unsupported.length) {
        errors.push(`Unsupported capabilities: ${unsupported.join(", ")}`);
      }
    }
  }

  const permissions = sanitizeStringArray(data.permissions);
  if (data.permissions !== undefined && !permissions) {
    errors.push("permissions must be an array or comma-separated string");
  }

  validateUiConfig(data.ui, errors);
  validatePluginDependencies(data.pluginDependencies, errors);

  return {
    valid: errors.length === 0,
    errors,
    normalized: {
      ...(data.name !== undefined ? { name: data.name?.trim() } : {}),
      ...(data.slug !== undefined ? { slug: data.slug?.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description?.trim() || "" } : {}),
      ...(data.author !== undefined ? { author: data.author?.trim() || null } : {}),
      ...(data.category !== undefined ? { category: data.category || null } : {}),
      ...(data.visibility !== undefined ? { visibility: data.visibility || "public" } : {}),
      ...(data.capabilities !== undefined ? { capabilities } : {}),
      ...(data.permissions !== undefined ? { permissions } : {}),
      ...(data.ui !== undefined ? { ui: data.ui || null } : {}),
      ...(data.pluginDependencies !== undefined ? { pluginDependencies: data.pluginDependencies || null } : {}),
    },
  };
}

function validateCreatePlugin(data) {
  const base = validatePluginMetadata(data);
  const errors = [...base.errors];

  if (!data.pricingType || typeof data.pricingType !== "string") {
    errors.push("pricingType is required");
  }

  return errors.length ? { valid: false, errors } : { valid: true, normalized: base.normalized };
}

function validateSubmitVersion(data) {
  const errors = [];
  const MAX_CHANGELOG_SIZE = 50000;

  if (!data.version || typeof data.version !== "string" || !data.version.trim()) {
    errors.push("version is required");
  }

  if (!data.download_url || typeof data.download_url !== "string" || !data.download_url.trim()) {
    errors.push("download_url is required");
  } else {
    try {
      new URL(data.download_url);
    } catch {
      errors.push("download_url must be a valid URL");
    }
  }

  // Validate changelog if provided
  if (data.changelog !== undefined && data.changelog !== null) {
    if (typeof data.changelog !== "string") {
      errors.push("changelog must be a string");
    } else if (data.changelog.length > MAX_CHANGELOG_SIZE) {
      errors.push(`changelog must not exceed ${MAX_CHANGELOG_SIZE} characters`);
    }
  }

  return errors.length ? { valid: false, errors } : { valid: true };
}

function validateUpdatePlugin(data) {
  return validatePluginMetadata(data, { partial: true });
}

module.exports = {
  validateCreatePlugin,
  validateSubmitVersion,
  validateUpdatePlugin,
};
