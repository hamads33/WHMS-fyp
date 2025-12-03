const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

module.exports = {
  ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  },

  async ensureDirAsync(dirPath) {
    await fsp.mkdir(dirPath, { recursive: true });
  },

  removeDirIfExists(dirPath) {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  },

  async removeDirIfExistsAsync(dirPath) {
    try {
      await fsp.rm(dirPath, { recursive: true, force: true });
    } catch (err) {
      // ignore
    }
  },

  async writeFile(filePath, data) {
    await fsp.writeFile(filePath, data);
  },

  readFile(filePath, encoding = 'utf8') {
    return fs.readFileSync(filePath, encoding);
  },

  exists(filePath) {
    return fs.existsSync(filePath);
  },

  join(...parts) {
    return path.join(...parts);
  }
};
