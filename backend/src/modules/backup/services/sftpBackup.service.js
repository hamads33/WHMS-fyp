const SFTP = require("ssh2-sftp-client");

module.exports = function SFTPAdapter(config) {
  return {

    /** ---------------------------
     *  UPLOAD FILE
     *  --------------------------*/
    async upload(localFilePath, remotePath) {
      const client = new SFTP();

      try {
        await client.connect({
          host: config.host,
          port: config.port || 22,
          username: config.user,
          password: config.password
        });

        console.log("[SFTP] Uploading:", remotePath);
        await client.put(localFilePath, remotePath);

        return { success: true };

      } catch (err) {
        console.error("[SFTP] Upload failed:", err.message);
        return { success: false, error: err.message };

      } finally {
        client.end();
      }
    },

    /** ---------------------------
     *  TEST CONNECTION
     *  --------------------------*/
    async testConnection() {
      const client = new SFTP();

      try {
        await client.connect({
          host: config.host,
          port: config.port || 22,
          username: config.user,
          password: config.password
        });

        return { success: true };

      } catch (err) {
        return { success: false, error: err.message };

      } finally {
        client.end();
      }
    },

    /** ---------------------------
     *  DOWNLOAD FILE
     *  --------------------------*/
    async download(remotePath, localFilePath) {
      const client = new SFTP();

      try {
        await client.connect({
          host: config.host,
          port: config.port || 22,
          username: config.user,
          password: config.password
        });

        console.log("[SFTP] Downloading:", remotePath);
        await client.fastGet(remotePath, localFilePath);

        return { success: true };

      } catch (err) {
        console.error("[SFTP] Download failed:", err.message);
        return { success: false, error: err.message };

      } finally {
        client.end();
      }
    }

  };
};
