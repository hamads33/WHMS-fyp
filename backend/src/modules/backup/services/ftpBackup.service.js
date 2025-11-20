const ftp = require("basic-ftp");

module.exports = function FTPAdapter(config) {
  return {

    /** -------------------------------
     *  UPLOAD FILE
     *  ------------------------------*/
    async upload(localFilePath, remotePath) {
      const client = new ftp.Client();
      client.ftp.verbose = false;

      try {
        await client.access({
          host: config.host,
          port: config.port || 21,
          user: config.user,
          password: config.password,
          secure: config.secure || false,
          passive: config.passive !== false
        });

        console.log("[FTP] Uploading:", remotePath);
        await client.uploadFrom(localFilePath, remotePath);

        return { success: true };
      } catch (err) {
        console.error("[FTP] Upload failed:", err.message);
        return { success: false, error: err.message };
      } finally {
        client.close();
      }
    },

    /** -------------------------------
     *  TEST CONNECTION
     *  ------------------------------*/
    async testConnection() {
      const client = new ftp.Client();

      try {
        await client.access({
          host: config.host,
          port: config.port || 21,
          user: config.user,
          password: config.password,
          secure: config.secure || false,
          passive: config.passive !== false
        });

        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      } finally {
        client.close();
      }
    },

    /** -------------------------------
     *  DOWNLOAD FILE
     *  ------------------------------*/
    async download(remotePath, localFilePath) {
      const client = new ftp.Client();

      try {
        await client.access({
          host: config.host,
          port: config.port || 21,
          user: config.user,
          password: config.password,
          secure: config.secure || false,
          passive: config.passive !== false
        });

        console.log("[FTP] Downloading:", remotePath);
        await client.downloadTo(localFilePath, remotePath);

        return { success: true };
      } catch (err) {
        console.error("[FTP] Download failed:", err.message);
        return { success: false, error: err.message };
      } finally {
        client.close();
      }
    }

  };
};
