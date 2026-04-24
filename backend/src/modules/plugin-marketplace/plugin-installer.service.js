/**
 * plugin-installer.service.js
 * ------------------------------------------------------------------
 * Downloads, verifies, extracts, and installs a marketplace plugin.
 *
 * Installation steps:
 *   1. Find the approved version record via PluginMarketplaceService
 *   2. Download the zip from download_url using axios
 *   3. Verify SHA-256 checksum (if provided)
 *   4. Extract zip into src/plugins/{slug}/ using adm-zip
 *   5. Validate extracted folder structure
 *   6. Hot-load the plugin via pluginManager.loadPluginFromPath()
 *   7. Return success result
 *
 * Dependencies:
 *   axios    — HTTP download
 *   adm-zip  — zip extraction (pure JS, no native bindings)
 *
 * Install with: npm install axios adm-zip
 */

const fs     = require("fs");
const path   = require("path");
const crypto = require("crypto");

const { validateExtractedPlugin } = require("./plugin-zip.validator");
const pluginStats                 = require("./plugin-stats.service");

// Destination root for installed plugins
const PLUGINS_ROOT = path.resolve(__dirname, "../../plugins");

class PluginInstallerService {
  /**
   * @param {object} opts
   * @param {object} opts.marketplaceService  - PluginMarketplaceService instance
   * @param {object} opts.pluginManager       - PluginManager instance (from app.locals)
   * @param {object} [opts.billingService]    - PluginBillingService instance (optional)
   * @param {object} [opts.logger]
   */
  constructor({ marketplaceService, pluginManager, billingService = null, logger = console } = {}) {
    this.marketplace     = marketplaceService;
    this.pluginManager   = pluginManager;
    this.billingService  = billingService;
    this.logger          = logger;
  }

  /**
   * installPlugin
   * Full installation flow for a marketplace plugin.
   *
   * @param  {string} slug  - Plugin slug to install
   * @param  {string|Function} [userIdOrOnProgress] - User ID (for access control) or onProgress callback
   * @param  {Function} [onProgress] - Optional callback: (step: string, progress: number) => void
   * @returns {Promise<{ success: boolean, slug: string, version: string, path: string }>}
   */
  async installPlugin(slug, userIdOrOnProgress = null, onProgress = null) {
    // Parse overloaded parameters: installPlugin(slug, onProgress) or installPlugin(slug, userId, onProgress)
    let userId = null;
    let progressCallback = null;

    if (typeof userIdOrOnProgress === "function") {
      progressCallback = userIdOrOnProgress;
    } else if (typeof userIdOrOnProgress === "string") {
      userId = userIdOrOnProgress;
      progressCallback = onProgress;
    }

    this.logger.info(`[Installer] Starting installation of plugin: ${slug}${userId ? ` (user: ${userId})` : ""}`);

    const progress = (step, pct) => {
      if (progressCallback && typeof progressCallback === "function") {
        try {
          progressCallback(step, pct);
        } catch (err) {
          this.logger.warn(`[Installer] onProgress callback error: ${err.message}`);
        }
      }
    };

    // ── Step 1: Find approved version ──────────────────────────
    let version;
    let plugin;
    try {
      progress("finding_version", 5);
      version = await this.marketplace.getApprovedVersion(slug);
      plugin = await this.marketplace.getPluginBySlug(slug);
    } catch (err) {
      progress("error", 0);
      err.statusCode = err.statusCode || 400;
      throw err;
    }

    this.logger.info(`[Installer] Found approved version: ${version.version} — ${version.download_url}`);

    // ── Step 1b: Access control — check if user purchased (if paid plugin) ───────────────────────
    if (plugin.pricingType !== "free" && userId) {
      try {
        progress("checking_access", 6);
        if (!this.billingService) {
          const err = new Error("Billing service not available for access control check");
          err.statusCode = 500;
          throw err;
        }

        const purchased = await this.billingService.hasPurchased(userId, plugin.id);
        if (!purchased) {
          const err = new Error("Purchase required to install this plugin");
          err.code = "PURCHASE_REQUIRED";
          err.statusCode = 402;
          err.pluginId = plugin.id;
          err.price = plugin.price;
          err.pricingType = plugin.pricingType;
          throw err;
        }

        this.logger.info(`[Installer] Access verified for user ${userId} on plugin ${slug}`);
      } catch (err) {
        progress("error", 0);
        throw err;
      }
    }

    // ── Step 2: Download zip ────────────────────────────────────
    let zipBuffer;
    try {
      progress("downloading", 10);
      zipBuffer = await this._download(version.download_url);
    } catch (err) {
      progress("error", 0);
      const e = new Error(`Failed to download plugin zip: ${err.message}`);
      e.statusCode = 502;
      throw e;
    }

    // ── Step 3: Verify checksum (if provided) ───────────────────
    try {
      progress("verifying", 25);
      if (version.checksum) {
        const actual = crypto.createHash("sha256").update(zipBuffer).digest("hex");
        if (actual !== version.checksum) {
          const e = new Error(
            `Checksum mismatch for "${slug}". Expected: ${version.checksum}, got: ${actual}`
          );
          e.statusCode = 400;
          throw e;
        }
        this.logger.info(`[Installer] Checksum verified for ${slug}`);
      } else {
        this.logger.warn(`[Installer] No checksum provided for "${slug}" — skipping verification`);
      }
    } catch (err) {
      progress("error", 0);
      throw err;
    }

    // ── Step 4: Extract zip into src/plugins/{slug}/ ────────────
    const destFolder = path.join(PLUGINS_ROOT, slug);
    try {
      progress("extracting", 40);
      this._extractZip(zipBuffer, destFolder);
    } catch (err) {
      progress("error", 0);
      const e = new Error(`Failed to extract plugin zip: ${err.message}`);
      e.statusCode = 400;
      throw e;
    }

    this.logger.info(`[Installer] Extracted plugin to: ${destFolder}`);

    // ── Step 5: Validate extracted structure ────────────────────
    try {
      progress("validating", 60);
      const validation = validateExtractedPlugin(destFolder);
      if (!validation.valid) {
        // Clean up bad extraction
        fs.rmSync(destFolder, { recursive: true, force: true });
        const e = new Error(`Invalid plugin structure: ${validation.errors.join("; ")}`);
        e.statusCode = 400;
        throw e;
      }

      this.logger.info(`[Installer] Plugin structure valid: ${JSON.stringify(validation.meta)}`);
    } catch (err) {
      progress("error", 0);
      throw err;
    }

    // ── Step 6: Hot-load the plugin via PluginManager ───────────
    try {
      progress("booting", 80);
      if (this.pluginManager && typeof this.pluginManager.loadPluginFromPath === "function") {
        try {
          await this.pluginManager.loadPluginFromPath(destFolder);
          this.logger.info(`[Installer] Plugin loaded by PluginManager: ${slug}`);
        } catch (err) {
          this.logger.error(`[Installer] PluginManager failed to load "${slug}": ${err.message}`);
          // Don't fail the install — plugin is on disk, will load on next restart
        }
      } else {
        this.logger.warn(
          `[Installer] PluginManager.loadPluginFromPath not available — ` +
          `plugin "${slug}" will be active after server restart`
        );
      }
    } catch (err) {
      progress("error", 0);
      throw err;
    }

    // ── Step 7: Record install stats ────────────────────────────
    pluginStats.recordInstall(slug);
    this.logger.info(`[Installer] Stats updated for "${slug}": install #${pluginStats.getPluginStats(slug).install_count}`);

    // ── Step 8: Return result ───────────────────────────────────
    progress("completed", 100);
    return {
      success : true,
      slug,
      version : version.version,
      path    : destFolder,
      stats   : pluginStats.getPluginStats(slug),
    };
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  /**
   * _download
   * Downloads a URL and returns a Buffer.
   *
   * Uses axios if available, falls back to native https module.
   *
   * @param  {string} url
   * @returns {Promise<Buffer>}
   */
  async _download(url) {
    // Try axios first
    try {
      const axios    = require("axios");
      const response = await axios.get(url, { responseType: "arraybuffer", timeout: 30000 });
      return Buffer.from(response.data);
    } catch (axiosErr) {
      if (axiosErr.code === "MODULE_NOT_FOUND") {
        // Fallback: native https/http
        return this._downloadNative(url);
      }
      throw axiosErr;
    }
  }

  /**
   * _downloadNative
   * Native Node.js HTTPS download fallback (no dependencies).
   *
   * @param  {string} url
   * @returns {Promise<Buffer>}
   */
  _downloadNative(url) {
    return new Promise((resolve, reject) => {
      const mod = url.startsWith("https") ? require("https") : require("http");
      mod.get(url, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} when downloading ${url}`));
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end",  ()      => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      }).on("error", reject);
    });
  }

  /**
   * _extractZip
   * Extracts a zip Buffer into the destination folder with security validation.
   * Validates all extracted paths to prevent path traversal attacks.
   * Detects and prevents ZIP bombs through size limits.
   *
   * @param {Buffer} zipBuffer
   * @param {string} destFolder
   */
  _extractZip(zipBuffer, destFolder) {
    let AdmZip;
    try {
      AdmZip = require("adm-zip");
    } catch {
      throw new Error(
        "adm-zip is not installed. Run: npm install adm-zip"
      );
    }

    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();

    // MAX_EXTRACTION_SIZE: limit total extracted size to 100MB to prevent zip bombs
    const MAX_EXTRACTION_SIZE = 100 * 1024 * 1024;
    let totalExtractedSize = 0;

    // Validate all entries before extraction
    const destFolderResolved = path.resolve(destFolder);

    for (const entry of entries) {
      // Check for path traversal attacks (e.g., ../../etc/passwd)
      const entryPath = path.resolve(destFolderResolved, entry.entryName);
      if (!entryPath.startsWith(destFolderResolved + path.sep) && entryPath !== destFolderResolved) {
        throw new Error(
          `Malicious path detected in ZIP: ${entry.entryName} would extract outside destination folder`
        );
      }

      // Check for zip bomb expansion
      if (!entry.isDirectory) {
        totalExtractedSize += entry.header.size;
        if (totalExtractedSize > MAX_EXTRACTION_SIZE) {
          throw new Error(
            `ZIP extraction would exceed maximum allowed size (${MAX_EXTRACTION_SIZE / (1024 * 1024)}MB). Possible ZIP bomb detected.`
          );
        }
      }

      // Check for symlink entries (some ZIP libraries support them)
      if (entry.entryName.includes("..")) {
        throw new Error(
          `Illegal path component detected in ZIP: ${entry.entryName}`
        );
      }
    }

    // Remove existing folder if present (re-install / update)
    if (fs.existsSync(destFolder)) {
      fs.rmSync(destFolder, { recursive: true, force: true });
    }
    fs.mkdirSync(destFolder, { recursive: true });

    // Extract validated entries
    zip.extractAllTo(destFolder, /* overwrite */ true);

    this.logger.info(`[Installer] ZIP extracted safely: ${entries.length} entries, ${totalExtractedSize / 1024}KB total`);
  }
}

module.exports = PluginInstallerService;
