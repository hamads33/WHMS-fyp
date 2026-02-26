/**
 * Provisioning Utilities
 * Path: src/modules/provisioning/utils/provisioning.util.js
 */

/**
 * Generate secure random password
 * Requirements: 12+ chars, uppercase, lowercase, numbers, special chars
 */
function generateSecurePassword(length = 16) {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*-_+=";

  const all = upper + lower + numbers + special;
  let password = "";

  // Ensure at least one of each type
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill rest randomly
  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

/**
 * Validate domain name
 */
function isValidDomain(domain) {
  const regex =
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  return regex.test(domain);
}

/**
 * Validate email address
 */
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Validate VestaCP username (3-16 chars, alphanumeric + hyphen)
 */
function isValidUsername(username) {
  const regex = /^[a-z0-9]{3,16}$/;
  return regex.test(username);
}

/**
 * Calculate disk quota for plan
 * Maps service plan to VestaCP disk limits
 */
function getPlanDiskQuota(planName) {
  const quotas = {
    starter: "50G",
    professional: "200G",
    enterprise: "1000G",
    unlimited: "unlimited",
  };

  return quotas[planName.toLowerCase()] || "100G"; // default 100GB
}

/**
 * Calculate bandwidth quota for plan
 */
function getPlanBandwidthQuota(planName) {
  const quotas = {
    starter: "500G",
    professional: "2000G",
    enterprise: "10000G",
    unlimited: "unlimited",
  };

  return quotas[planName.toLowerCase()] || "1000G"; // default 1TB
}

/**
 * Calculate number of databases allowed
 */
function getPlanDatabaseLimit(planName) {
  const limits = {
    starter: 5,
    professional: 20,
    enterprise: 100,
    unlimited: 999,
  };

  return limits[planName.toLowerCase()] || 10; // default 10
}

/**
 * Calculate number of email accounts allowed
 */
function getPlanEmailLimit(planName) {
  const limits = {
    starter: 10,
    professional: 50,
    enterprise: 500,
    unlimited: 999,
  };

  return limits[planName.toLowerCase()] || 25; // default 25
}

module.exports = {
  generateSecurePassword,
  isValidDomain,
  isValidEmail,
  isValidUsername,
  getPlanDiskQuota,
  getPlanBandwidthQuota,
  getPlanDatabaseLimit,
  getPlanEmailLimit,
};
