// src/modules/backup/bootstrap.js
const { registerBackupProvider } = require("./provider/registry");

const LocalProvider = require("./provider/local.provider");
const S3Provider = require("./provider/s3.provider");
const SftpProvider = require("./provider/sftp.provider");

// Built-in providers
registerBackupProvider({
  id: "local",
  label: "Local Storage",
  schema: { localPath: { type: "string", required: false } },
  ProviderClass: LocalProvider
});

registerBackupProvider({
  id: "s3",
  label: "Amazon S3",
  schema: {
    accessKeyId: { type: "string" },
    secretAccessKey: { type: "string" },
    region: { type: "string" },
    bucket: { type: "string" }
  },
  ProviderClass: S3Provider
});

registerBackupProvider({
  id: "sftp",
  label: "SFTP",
  schema: {
    host: { type: "string" },
    port: { type: "number" },
    user: { type: "string" },
    password: { type: "string" }
  },
  ProviderClass: SftpProvider
});

console.log("[Backup] Built-in providers registered.");
