// src/modules/backup/provider/sftp.provider.js
const SFTP = require("ssh2-sftp-client");
const path = require("path");
const BaseProvider = require("./baseProvider");

class SftpProvider extends BaseProvider {
  constructor(config) {
    super(config);
    this.config = config;
  }

  async _connect() {
    const client = new SFTP();
    await client.connect({
      host: this.config.host,
      port: this.config.port || 22,
      username: this.config.user,
      password: this.config.password,
      // support privateKey later
    });
    return client;
  }

  async test() {
    const client = await this._connect();
    try {
      await client.list(".");
      return true;
    } finally {
      client.end();
    }
  }

  async uploadStream(readableStream, remotePath) {
    const client = await this._connect();
    const tmp = `${remotePath}.part-${Date.now()}`;
    try {
      await client.put(readableStream, tmp);
      await client.rename(tmp, remotePath);
    } finally {
      client.end();
    }
  }

  /**
   * Download remotePath into a Writable stream - MUST throw on error.
   * (Used by HTTP download endpoint)
   * FIX: Original used fastGet incorrectly - now uses get() which returns a stream
   */
  async downloadToStream(remotePath, writableStream) {
    const client = await this._connect();
    try {
      const stream = await client.get(remotePath);
      return new Promise((resolve, reject) => {
        stream.pipe(writableStream);
        stream.on("error", reject);
        writableStream.on("finish", resolve);
        writableStream.on("error", reject);
      });
    } finally {
      client.end();
    }
  }

  /**
   * Download remotePath and return a Readable stream.
   * (Used by restore flow)
   * FIX: This method was missing in the original implementation
   */
  async downloadStream(remotePath) {
    const client = await this._connect();
    const stream = await client.get(remotePath);
    
    // Ensure connection closes when stream ends
    stream.on("end", () => client.end());
    stream.on("error", () => client.end());
    
    return stream;
  }

  async delete(remotePath) {
    const client = await this._connect();
    try {
      await client.delete(remotePath);
    } finally {
      client.end();
    }
  }

  /**
   * Optional: Get file stats
   */
  async stat(remotePath) {
    const client = await this._connect();
    try {
      const stats = await client.stat(remotePath);
      return {
        size: stats.size,
        mtime: new Date(stats.modifyTime)
      };
    } catch (err) {
      return null;
    } finally {
      client.end();
    }
  }
}

module.exports = SftpProvider;