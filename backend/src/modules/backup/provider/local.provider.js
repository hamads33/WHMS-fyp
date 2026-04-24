const fs = require("fs-extra");
const path = require("path");
const BaseProvider = require("./baseProvider");
const storagePathsService = require("../../settings/storage-paths.service");

class LocalProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    // If localPath was explicitly provided in the StorageConfig record use it;
    // otherwise resolve lazily from system settings on first use.
    this._explicitPath = config.localPath || null;
    this._resolvedPath = null;
  }

  async _getBasePath() {
    if (this._resolvedPath) return this._resolvedPath;
    if (this._explicitPath) {
      this._resolvedPath = this._explicitPath;
    } else {
      this._resolvedPath = await storagePathsService.resolve("backupsPath");
    }
    return this._resolvedPath;
  }

  async test() {
    const basePath = await this._getBasePath();
    await fs.ensureDir(basePath);
    const tmp = path.join(basePath, `.baktest-${Date.now()}.tmp`);
    await fs.writeFile(tmp, "ok");
    await fs.remove(tmp);
    return true;
  }

  async uploadStream(readableStream, remotePath) {
    const basePath = await this._getBasePath();
    const dest = path.join(basePath, remotePath);
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
    const basePath = await this._getBasePath();
    const src = path.join(basePath, remotePath);
    const rs = fs.createReadStream(src);
    return new Promise((resolve, reject) => {
      rs.pipe(writableStream);
      writableStream.on("finish", resolve);
      rs.on("error", reject);
      writableStream.on("error", reject);
    });
  }

  /**
   * REQUIRED by BaseProvider
   * Used by restore flow
   */
  async downloadStream(remotePath) {
    const basePath = await this._getBasePath();
    const src = path.join(basePath, remotePath);
    return fs.createReadStream(src);
  }

  async delete(remotePath) {
    const basePath = await this._getBasePath();
    const p = path.join(basePath, remotePath);
    await fs.remove(p);
  }

  async stat(remotePath) {
    const basePath = await this._getBasePath();
    const p = path.join(basePath, remotePath);
    const s = await fs.stat(p);
    return { size: s.size, mtime: s.mtime };
  }
}

module.exports = LocalProvider;
