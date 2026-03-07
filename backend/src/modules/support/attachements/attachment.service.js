'use strict';

/**
 * attachments/attachment.service.js
 *
 * Thin wrapper around the platform's storage backend.
 * Pluggable: swap local FS for S3 by changing the storageDriver.
 */

const path = require('path');
const crypto = require('crypto');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

class AttachmentService {
  /**
   * @param {object} storageDriver  - { put(key, buffer, mimeType): Promise<{ url }> }
   */
  constructor(storageDriver) {
    this.storage = storageDriver;
  }

  /**
   * Validate, store, and return metadata for an uploaded file.
   * @param {{ originalname, mimetype, size, buffer }} file  - multer file object
   * @param {string} namespace  - e.g. 'tickets' or 'chat'
   */
  async store(file, namespace = 'support') {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new Error(`File type "${file.mimetype}" is not allowed`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large (max ${MAX_FILE_SIZE / 1024 / 1024} MB)`);
    }

    const ext        = path.extname(file.originalname);
    const hash       = crypto.randomBytes(16).toString('hex');
    const storageKey = `${namespace}/${hash}${ext}`;

    const result = await this.storage.put(storageKey, file.buffer, file.mimetype);

    return {
      fileName:   file.originalname,
      mimeType:   file.mimetype,
      sizeBytes:  file.size,
      storageKey,
      url:        result.url || null,
    };
  }

  async getSignedUrl(storageKey, expiresInSeconds = 3600) {
    if (typeof this.storage.signedUrl === 'function') {
      return this.storage.signedUrl(storageKey, expiresInSeconds);
    }
    return null;
  }

  async delete(storageKey) {
    if (typeof this.storage.delete === 'function') {
      await this.storage.delete(storageKey);
    }
  }
}

module.exports = { AttachmentService };
