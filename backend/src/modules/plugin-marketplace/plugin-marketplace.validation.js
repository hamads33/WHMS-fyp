/**
 * plugin-marketplace.validation.js
 * ------------------------------------------------------------------
 * Input validation helpers.
 * Returns { valid: true } or { valid: false, errors: [...] }
 */

function validateCreatePlugin(data) {
  const errors = [];

  if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
    errors.push("name is required");
  }

  if (!data.slug || typeof data.slug !== "string" || !data.slug.trim()) {
    errors.push("slug is required");
  } else if (!/^[a-z0-9-]+$/.test(data.slug.trim())) {
    errors.push("slug must be lowercase letters, numbers, and hyphens only");
  }

  if (!data.author || typeof data.author !== "string" || !data.author.trim()) {
    errors.push("author is required");
  }

  return errors.length ? { valid: false, errors } : { valid: true };
}

function validateSubmitVersion(data) {
  const errors = [];

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

  return errors.length ? { valid: false, errors } : { valid: true };
}

module.exports = { validateCreatePlugin, validateSubmitVersion };
