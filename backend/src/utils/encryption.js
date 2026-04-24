/**
 * Encryption Utility
 * Path: src/utils/encryption.js
 *
 * AES-256-GCM authenticated encryption for sensitive data.
 * Uses HOSTING_ENCRYPTION_KEY environment variable (must be 32-byte hex or string).
 *
 * Format: base64(iv):base64(authTag):base64(ciphertext)
 * This single-string format works well for String database fields.
 *
 * Migration Safety:
 * - decryptValue() returns the input unchanged if it's not in encrypted format
 * - This allows gradual migration of unencrypted data
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Derive encryption key from HOSTING_ENCRYPTION_KEY env var
 * Accepts hex string (64 chars) or plain string (32+ chars)
 */
function getKey() {
  const keyEnv = process.env.HOSTING_ENCRYPTION_KEY;
  if (!keyEnv) {
    throw new Error('HOSTING_ENCRYPTION_KEY environment variable is not set');
  }

  let key;
  if (/^[0-9a-f]{64}$/i.test(keyEnv)) {
    // Assume hex string
    key = Buffer.from(keyEnv, 'hex');
  } else {
    // Treat as plain string, hash it to 32 bytes
    key = crypto.scryptSync(keyEnv, 'salt', KEY_LENGTH);
  }

  if (key.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must be ${KEY_LENGTH} bytes, got ${key.length}`);
  }

  return key;
}

/**
 * Encrypt plaintext using AES-256-GCM
 * Returns: "base64(iv):base64(tag):base64(ciphertext)"
 */
function encryptValue(plaintext) {
  if (!plaintext) return '';

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(String(plaintext), 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  const authTag = cipher.getAuthTag();
  const authTagBase64 = authTag.toString('base64');
  const ivBase64 = iv.toString('base64');

  return `${ivBase64}:${authTagBase64}:${ciphertext}`;
}

/**
 * Decrypt AES-256-GCM ciphertext
 * Input: "base64(iv):base64(tag):base64(ciphertext)"
 * Returns plaintext, or the input unchanged if not in encrypted format (migration safety)
 */
function decryptValue(encrypted) {
  if (!encrypted || typeof encrypted !== 'string') return encrypted;

  // Check if in expected format (contains colons)
  if (!encrypted.includes(':')) {
    return encrypted; // Not encrypted, return as-is
  }

  try {
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      return encrypted; // Not valid format
    }

    const [ivBase64, authTagBase64, ciphertext] = parts;
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    if (iv.length !== IV_LENGTH || authTag.length !== TAG_LENGTH) {
      return encrypted; // Invalid format
    }

    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  } catch (err) {
    // If decryption fails, return original (migration safety)
    console.warn(`[Encryption] Decryption failed (likely unencrypted data):`, err.message);
    return encrypted;
  }
}

module.exports = { encryptValue, decryptValue };
