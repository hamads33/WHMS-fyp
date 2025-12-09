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
    await client.list(".");
    client.end();
    return true;
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

  async downloadToStream(remotePath, writableStream) {
    const client = await this._connect();
    try {
      await client.fastGet(remotePath, writableStream.path || writableStream);
    } finally {
      client.end();
    }
  }

  async delete(remotePath) {
    const client = await this._connect();
    try {
      await client.delete(remotePath);
    } finally {
      client.end();
    }
  }
}

module.exports = SftpProvider;
