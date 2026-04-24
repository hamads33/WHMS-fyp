/**
 * CyberPanel SSH Driver (Production-Ready)
 * Path: src/modules/provisioning/drivers/cyberpanel.driver.js
 *
 * CyberPanel has no stable REST API. All provisioning uses SSH to execute
 * the `cyberpanel` CLI directly on the VPS.
 *
 * Verified against actual CyberPanel CLI source at /usr/local/CyberCP/cli/cyberPanel.py
 * Real CLI function names and arg names differ from what the API docs suggest — this
 * driver uses the exact names confirmed from the source.
 *
 * Suspend/unsuspend: CyberPanel CLI has no suspend command. We use the web API
 * with admin credentials (session-based POST) for those two operations.
 *
 * Environment variables (used when no DB credentials available):
 *   CYBERPANEL_SSH_HOST=192.168.x.x
 *   CYBERPANEL_SSH_PORT=22
 *   CYBERPANEL_SSH_USER=root
 *   CYBERPANEL_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----...
 *   CYBERPANEL_SSH_PASSWORD=fallback-only
 *   CYBERPANEL_ADMIN_USER=admin
 *   CYBERPANEL_ADMIN_PASS=panelAdminPassword
 *   CYBERPANEL_PANEL_PORT=8090
 *   CYBERPANEL_CMD_TIMEOUT=60000
 */

const { Client } = require('ssh2');
const https = require('https');
const http = require('http');

// Exact CLI function names verified from /usr/local/CyberCP/cli/cyberPanel.py
const ALLOWED_COMMANDS = new Set([
  'createWebsite',
  'deleteWebsite',
  'listWebsitesJson',   // NOTE: listWebsites does NOT exist — must use listWebsitesJson
  'issueSSL',
  'createDatabase',
  'deleteDatabase',
  'createEmail',
  'deleteEmail',
]);

// Strict allowlist for identifiers (domains, usernames, db names)
const SAFE_IDENT_RE = /^[a-zA-Z0-9._-]+$/;
const SAFE_EMAIL_RE = /^[a-zA-Z0-9._%+@-]+$/;

/**
 * Wraps a value in single-quotes and escapes any internal single-quotes.
 * Standard POSIX sh escaping — safe for all printable characters including passwords.
 */
function shellEscape(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

class CyberPanelDriver {
  constructor(config = {}) {
    this.host = config.host || process.env.CYBERPANEL_SSH_HOST || process.env.CYBERPANEL_HOST || '';
    this.sshPort = Number(config.sshPort || process.env.CYBERPANEL_SSH_PORT || 22);
    this.sshUser = config.sshUser || process.env.CYBERPANEL_SSH_USER || 'root';
    this.sshPrivateKey = config.sshPrivateKey || process.env.CYBERPANEL_SSH_KEY || '';
    this.sshPassword = config.sshPassword || process.env.CYBERPANEL_SSH_PASSWORD || '';
    this.adminUser = config.adminUser || process.env.CYBERPANEL_ADMIN_USER || 'admin';
    this.adminPass = config.adminPass || process.env.CYBERPANEL_ADMIN_PASS || '';
    this.panelPort = Number(config.panelPort || process.env.CYBERPANEL_PANEL_PORT || 8090);
    this.commandTimeoutMs = Number(process.env.CYBERPANEL_CMD_TIMEOUT || 60000);

    if (!this.host) {
      console.warn('[CyberPanel] SSH host not set — provisioning disabled');
    }
    if (!this.sshPrivateKey && !this.sshPassword) {
      console.warn('[CyberPanel] No SSH credentials — provisioning disabled');
    }
  }

  get configured() {
    return !!(this.host && (this.sshPrivateKey || this.sshPassword));
  }

  _assertSafe(value, field, re = SAFE_IDENT_RE) {
    if (!value || !re.test(String(value))) {
      throw new Error(`Invalid value for "${field}": "${value}" — only safe characters allowed`);
    }
    return String(value);
  }

  _buildCommand(subcommand, args) {
    if (!ALLOWED_COMMANDS.has(subcommand)) {
      throw new Error(`CyberPanel command not in whitelist: "${subcommand}"`);
    }
    const parts = ['cyberpanel', subcommand];
    for (const [flag, val] of Object.entries(args)) {
      if (val === undefined || val === null) continue;
      parts.push(`--${flag}`, shellEscape(String(val)));
    }
    return parts.join(' ');
  }

  /**
   * Open an SSH connection, execute one command, return parsed output.
   * Connection is always closed after the command exits.
   */
  _sshExec(cmd) {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      let stdout = '';
      let stderr = '';
      let settled = false;

      const finish = (err, value) => {
        if (settled) return;
        settled = true;
        conn.end();
        if (err) reject(err);
        else resolve(value);
      };

      const timer = setTimeout(() => {
        finish(new Error(`SSH command timed out after ${this.commandTimeoutMs}ms`));
      }, this.commandTimeoutMs);

      conn.on('ready', () => {
        conn.exec(cmd, (err, stream) => {
          if (err) { clearTimeout(timer); return finish(err); }

          stream.on('data', (chunk) => { stdout += chunk; });
          stream.stderr.on('data', (chunk) => { stderr += chunk; });

          stream.on('close', (code) => {
            clearTimeout(timer);

            if (code !== 0) {
              const detail = (stderr || stdout).trim().substring(0, 400);
              return finish(new Error(`cyberpanel CLI exited ${code}: ${detail}`));
            }

            const raw = stdout.trim();
            if (!raw) return finish(null, { success: true, output: '' });

            try {
              finish(null, JSON.parse(raw));
            } catch {
              finish(null, { success: true, output: raw });
            }
          });
        });
      });

      conn.on('error', (err) => {
        clearTimeout(timer);
        finish(new Error(`SSH error: ${err.message}`));
      });

      const connectOpts = {
        host: this.host,
        port: this.sshPort,
        username: this.sshUser,
        readyTimeout: 15000,
        keepaliveInterval: 0,
      };

      if (this.sshPrivateKey) {
        connectOpts.privateKey = this.sshPrivateKey;
      } else {
        connectOpts.password = this.sshPassword;
      }

      conn.connect(connectOpts);
    });
  }

  /**
   * POST to CyberPanel web API with admin credentials in the request body.
   * Used for operations the CLI doesn't support (suspend/unsuspend).
   * CyberPanel runs on port 8090 (HTTP by default on VPS setups).
   */
  _webApiPost(endpoint, extraBody = {}) {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        adminUser: this.adminUser,
        adminPass: this.adminPass,
        ...extraBody,
      });

      const proto = this.panelPort === 443 ? https : http;
      const options = {
        hostname: this.host,
        port: this.panelPort,
        path: `/api/${endpoint}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        rejectUnauthorized: false,
      };

      let data = '';
      const req = proto.request(options, (res) => {
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({ output: data });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(); reject(new Error('Web API timeout')); });
      req.write(body);
      req.end();
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Create a website on CyberPanel.
   * CLI: cyberpanel createWebsite --package <pkg> --owner <admin> --domainName <domain> --email <email> --php <version>
   */
  async createWebsite({ domain, email, phpVersion = '8.1', package: pkg }) {
    this._assertSafe(domain, 'domain');
    this._assertSafe(email, 'email', SAFE_EMAIL_RE);
    return this._sshExec(this._buildCommand('createWebsite', {
      package: pkg || 'Default',
      owner: this.adminUser,
      domainName: domain,
      email,
      php: phpVersion,
    }));
  }

  /**
   * Delete a website and all its data.
   * CLI: cyberpanel deleteWebsite --domainName <domain>
   */
  async deleteWebsite(domain) {
    this._assertSafe(domain, 'domain');
    return this._sshExec(this._buildCommand('deleteWebsite', { domainName: domain }));
  }

  /**
   * Suspend a website via CyberPanel web API.
   * The CLI has no suspend command — web API is the only option.
   */
  async suspendWebsite(domain) {
    this._assertSafe(domain, 'domain');
    if (!this.adminPass) {
      throw new Error('adminPass required for suspend (CLI has no suspend command)');
    }
    const result = await this._webApiPost('suspendWebsite', { domainName: domain, state: 'suspend' });
    if (result.error_message && result.error_message !== 'None') {
      throw new Error(`Suspend failed: ${result.error_message}`);
    }
    return { success: true, domain, status: 'suspended' };
  }

  /**
   * Unsuspend a website via CyberPanel web API.
   */
  async unsuspendWebsite(domain) {
    this._assertSafe(domain, 'domain');
    if (!this.adminPass) {
      throw new Error('adminPass required for unsuspend (CLI has no unsuspend command)');
    }
    const result = await this._webApiPost('suspendWebsite', { domainName: domain, state: 'unsuspend' });
    if (result.error_message && result.error_message !== 'None') {
      throw new Error(`Unsuspend failed: ${result.error_message}`);
    }
    return { success: true, domain, status: 'unsuspended' };
  }

  /**
   * List all websites as JSON.
   * CLI: cyberpanel listWebsitesJson   (NOT listWebsites — that function does not exist)
   */
  async listWebsites() {
    return this._sshExec(this._buildCommand('listWebsitesJson', {}));
  }

  /**
   * Issue a Let's Encrypt SSL certificate.
   * CLI: cyberpanel issueSSL --domainName <domain>
   */
  async issueSSL(domain) {
    this._assertSafe(domain, 'domain');
    return this._sshExec(this._buildCommand('issueSSL', { domainName: domain }));
  }

  /**
   * Create a MySQL/MariaDB database under a domain.
   * CLI: cyberpanel createDatabase --databaseWebsite <domain> --dbName <name> --dbUsername <user> --dbPassword <pass>
   * NOTE: arg is --dbUsername, NOT --dbUser
   */
  async createDatabase({ domain, dbName, dbUser, dbPassword }) {
    this._assertSafe(domain, 'domain');
    this._assertSafe(dbName, 'dbName');
    this._assertSafe(dbUser, 'dbUser');
    return this._sshExec(this._buildCommand('createDatabase', {
      databaseWebsite: domain,
      dbName,
      dbUsername: dbUser,   // CLI uses --dbUsername, not --dbUser
      dbPassword,
    }));
  }

  /**
   * Delete a database by name.
   * CLI: cyberpanel deleteDatabase --dbName <name>
   */
  async deleteDatabase({ dbName }) {
    this._assertSafe(dbName, 'dbName');
    return this._sshExec(this._buildCommand('deleteDatabase', { dbName }));
  }

  /**
   * Create an email account under a domain.
   * CLI: cyberpanel createEmail --domainName <domain> --userName <user> --password <pass>
   * NOTE: arg is --userName (not --emailUser), and there is NO --quota parameter
   */
  async createEmail({ domain, emailUser, password }) {
    this._assertSafe(domain, 'domain');
    this._assertSafe(emailUser, 'emailUser');
    return this._sshExec(this._buildCommand('createEmail', {
      domainName: domain,
      userName: emailUser,  // CLI uses --userName, not --emailUser
      password,
    }));
  }

  /**
   * Delete an email account.
   * CLI: cyberpanel deleteEmail --email user@domain.com
   * NOTE: takes the full email address, NOT separate domain + user
   */
  async deleteEmail({ domain, emailUser }) {
    this._assertSafe(domain, 'domain');
    this._assertSafe(emailUser, 'emailUser');
    const fullEmail = `${emailUser}@${domain}`;
    return this._sshExec(this._buildCommand('deleteEmail', {
      email: fullEmail,   // CLI takes --email user@domain.com, not --domainName + --emailUser
    }));
  }

  /**
   * Test SSH connectivity by running listWebsitesJson (safe, read-only).
   */
  async testConnection() {
    if (!this.configured) {
      throw new Error('CyberPanel SSH credentials not configured');
    }
    await this._sshExec(this._buildCommand('listWebsitesJson', {}));
    return { connected: true, success: true, message: 'CyberPanel SSH connection verified' };
  }
}

module.exports = new CyberPanelDriver();
module.exports.CyberPanelDriver = CyberPanelDriver;
