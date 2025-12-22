// src/modules/backup/provider/pluginApi.js
const { registerBackupProvider } = require("./registry");

function registerProvider(def) {
  if (!def.id) throw new Error("Provider must have id");
  if (!def.ProviderClass) throw new Error("Provider must supply ProviderClass");
  registerBackupProvider(def);
  console.log(`[PluginAPI] Backup provider registered: ${def.id}`);
}

module.exports = {
  registerBackupProvider: registerProvider
};


// Plugins can now:
// const { registerBackupProvider } = require("@app/backup/provider/pluginApi");

// registerBackupProvider({
//   id: "wasabi",
//   label: "Wasabi S3",
//   schema: { accessKey: {...}, secretKey: {...}, bucket: {...} },
//   ProviderClass: WasabiProviderClass
// });
