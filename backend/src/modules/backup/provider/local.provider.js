// src/modules/backup/provider/local.provider.js
const fs = require("fs-extra");
const path = require("path");
const BaseProvider = require("./baseProvider");

class LocalProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.basePath = config.localPath || path.join(process.cwd(), "storage", "backups");
  }

  async test() {
    await fs.ensureDir(this.basePath);
    // Check write permission
    const tmp = path.join(this.basePath, `.baktest-${Date.now()}.tmp`);
    await fs.writeFile(tmp, "ok");
    await fs.remove(tmp);
    return true;
  }

  async uploadStream(readableStream, remotePath) {
    const dest = path.join(this.basePath, remotePath);
    await fs.ensureDir(path.dirname(dest));
    const ws = fs.createWriteStream(dest);
    return new Promise((resolve, reject) => {
      readableStream.pipe(ws);
      ws.on("finish", () => resolve());
      ws.on("error", reject);
      readableStream.on("error", reject);
    });
  }

  async downloadToStream(remotePath, writableStream) {
    const src = path.join(this.basePath, remotePath);
    const rs = fs.createReadStream(src);
    return new Promise((resolve, reject) => {
      rs.pipe(writableStream);
      writableStream.on("finish", resolve);
      rs.on("error", reject);
      writableStream.on("error", reject);
    });
  }

  async delete(remotePath) {
    const p = path.join(this.basePath, remotePath);
    await fs.remove(p);
  }

  async stat(remotePath) {
    const p = path.join(this.basePath, remotePath);
    const s = await fs.stat(p);
    return { size: s.size, mtime: s.mtime };
  }
}

module.exports = LocalProvider;
