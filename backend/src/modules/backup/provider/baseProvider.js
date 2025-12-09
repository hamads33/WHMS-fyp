// src/modules/backup/provider/baseProvider.js
class BaseProvider {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Validate & test connection - must throw on failure
   */
  async test() {
    throw new Error("Not implemented");
  }

  /**
   * Upload stream to remotePath. MUST throw on error.
   * Accepts Readable stream
   */
  async uploadStream(readableStream, remotePath, opts = {}) {
    throw new Error("Not implemented");
  }

  /**
   * Download remotePath into a Writable stream - MUST throw on error.
   */
  async downloadToStream(remotePath, writableStream) {
    throw new Error("Not implemented");
  }

  /**
   * Delete remotePath - MUST throw on error.
   */
  async delete(remotePath) {
    throw new Error("Not implemented");
  }

  /**
   * Optional stat/metadata
   */
  async stat(remotePath) {
    return null;
  }
}

module.exports = BaseProvider;
