const BackupService = require('../services/backup.service');
const storageConfigService = require('../services/storageConfig.service');

const FTPAdapter = require("../services/ftpBackup.service");
const SFTPAdapter = require("../services/sftpBackup.service");

//
// ─────────────────────────────────────────────
//   RUN BACKUP (Enqueue Job)
// ─────────────────────────────────────────────
//
const runBackup = async (req, res) => {
  try {
    const payload = req.body;

    const backupRecord = await BackupService.createAndEnqueueBackup(
      req.user?.id || null,
      payload
    );

    return res.status(201).json({ success: true, data: backupRecord });

  } catch (err) {
    console.error("runBackup error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

//
// ─────────────────────────────────────────────
//   LIST ALL BACKUPS
// ─────────────────────────────────────────────
//
const listBackups = async (req, res) => {
  try {
    const backups = await BackupService.list(req.query);
    return res.json({ success: true, data: backups });
  } catch (err) {
    console.error("listBackups error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

//
// ─────────────────────────────────────────────
//   GET BACKUP BY ID
// ─────────────────────────────────────────────
//
const getBackup = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const backup = await BackupService.getById(id);

    if (!backup)
      return res.status(404).json({ success: false, error: "Not found" });

    return res.json({ success: true, data: backup });

  } catch (err) {
    console.error("getBackup error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

//
// ─────────────────────────────────────────────
//   DELETE BACKUP
// ─────────────────────────────────────────────
//
const deleteBackup = async (req, res) => {
  try {
    const id = Number(req.params.id);

    await BackupService.cancelAndDelete(id);

    return res.json({ success: true });

  } catch (err) {
    console.error("deleteBackup error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

//
// ─────────────────────────────────────────────
//   TEST STORAGE CONNECTION (FTP / FTPS / SFTP)
// ─────────────────────────────────────────────
//
const testStorageConnection = async (req, res) => {
  try {
    const config = req.body;

    if (!config.provider)
      return res.status(400).json({ success: false, error: "provider is required" });

    // FTP / FTPS
    if (config.provider === "ftp" || config.provider === "ftps") {
      const adapter = FTPAdapter(config);
      const result = await adapter.testConnection();
      return res.json(result);
    }

    // SFTP
    if (config.provider === "sftp") {
      const adapter = SFTPAdapter(config);
      const result = await adapter.testConnection();
      return res.json(result);
    }

    return res.status(400).json({ success: false, error: "Unknown provider" });

  } catch (err) {
    console.error("testStorageConnection error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
// POST /api/backups/:id/restore
// body: { destination: "/some/path", restoreDb: true, restoreFiles: true }
const restoreBackup = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rec = await BackupService.getById(id);
    if (!rec) return res.status(404).json({ success:false, error: 'Not found' });

    // For remote (ftp/sftp) files we need to download to tmp then restore
    const tmpDir = path.join(os.tmpdir(), `restore-${rec.id}-${Date.now()}`);
    await fs.ensureDir(tmpDir);
    const archiveLocal = path.join(tmpDir, path.basename(rec.filePath));

    // download - use adapter
    const sc = rec.storageConfigId ? await storageConfigService.getStorageConfig(rec.storageConfigId) : null;
    let storageConf = sc ? storageConfigService.decrypt(sc.config) : null;
    if (sc) storageConf.provider = sc.provider;

    if (storageConf && (storageConf.provider === 'ftp' || storageConf.provider === 'ftps')) {
      const adapter = FTPAdapter(storageConf);
      // implement adapter.download(localPath, remotePath) in FTPAdapter (we'll add below)
      await adapter.download(archiveLocal, rec.filePath);
    } else if (storageConf && storageConf.provider === 'sftp') {
      const adapter = SFTPAdapter(storageConf);
      await adapter.download(archiveLocal, rec.filePath);
    } else {
      // local file: copy from path (rec.filePath)
      await fs.copy(rec.filePath, archiveLocal);
    }

    // unpack and apply
    // decompress to tmpDir/extracted
    const extractDir = path.join(tmpDir, 'extracted');
    await fs.ensureDir(extractDir);
    // use tar.extract (we used compressToTarGz to create) — implement util to extract
    const { extractTarGz } = require('../utils/zip.util');
    await extractTarGz(archiveLocal, extractDir);

    // if restoreDb: find .sql file and run psql (or mysql)
    // careful: must only be allowed to run by admins; provide warnings
    // We'll return extracted path and let operator run restore manually OR implement auto-restore (dangerous).
    return res.json({ success:true, message: 'Downloaded and extracted', path: extractDir });

  } catch (err) {
    console.error('restore error', err);
    return res.status(500).json({ success:false, error: err.message });
  }
};

//
// ─────────────────────────────────────────────
//   EXPORTS
// ─────────────────────────────────────────────
//
module.exports = {
  runBackup,
  listBackups,
  getBackup,
  deleteBackup,
  testStorageConnection,
  restoreBackup
};
