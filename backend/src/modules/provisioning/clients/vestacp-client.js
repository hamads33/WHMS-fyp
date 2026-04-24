/**
 * VestaCP API Client
 * Path: src/modules/provisioning/clients/vestacp-client.js
 *
 * Wrapper around VestaCP REST API
 * VestaCP runs on port 8083 (HTTPS)
 * Requires: API token from VestaCP admin panel
 *
 * Environment variables:
 *   VESTACP_HOST=vesta.yourdomain.com or 192.168.x.x
 *   VESTACP_PORT=8083
 *   VESTACP_TOKEN=your_api_token_here
 */

const https = require("https");
const http = require("http");
const querystring = require("querystring");

class VestaCPClient {
  /**
   * @param {object} [override] - Optional credential override from DB settings
   * @param {string} [override.host]
   * @param {number} [override.port]
   * @param {string} [override.token]
   */
  constructor(override = {}) {
    this.host = override.host || process.env.VESTACP_HOST || "localhost";
    this.port = Number(override.port || process.env.VESTACP_PORT || 8083);
    this.token = override.token || process.env.VESTACP_TOKEN;
    this.protocol = this.port === 443 || this.port === 8083 ? https : http;

    if (!this.token) {
      console.warn("[VestaCP] VESTACP_TOKEN not set — provisioning calls will be skipped (manual mode)");
    }
  }

  get configured() {
    return !!this.token;
  }

  /**
   * Generic API call to VestaCP
   * Returns parsed response or throws error
   */
  async call(cmd, args = {}) {
    return new Promise((resolve, reject) => {
      // Add token to args
      args.token = this.token;

      // Build query string
      const queryStr = querystring.stringify(args);

      const options = {
        hostname: this.host,
        port: this.port,
        path: `/api/${cmd}/?${queryStr}`,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        rejectUnauthorized: process.env.VESTACP_REJECT_UNAUTHORIZED !== 'false',
      };

      const req = this.protocol.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            // VestaCP returns JSON response
            const result = JSON.parse(data);

            // Check for API errors
            if (result.error) {
              const err = new Error(result.error);
              err.statusCode = 400;
              err.vestaError = result.error;
              return reject(err);
            }

            resolve(result);
          } catch (parseErr) {
            reject(parseErr);
          }
        });
      });

      req.on("error", (err) => {
        const apiErr = new Error(`VestaCP API error: ${err.message}`);
        apiErr.statusCode = 503;
        apiErr.original = err;
        reject(apiErr);
      });

      // VestaCP doesn't require body for POST to query string
      req.end();
    });
  }

  /**
   * Create hosting account
   * Maps to: /api/v1/command/?cmd=v-add-user
   */
  async createAccount(data) {
    const result = await this.call("v-add-user", {
      user: data.username,
      password: data.password,
      email: data.email,
      fname: data.firstName || data.username,
      lname: data.lastName || "",
    });

    return {
      username: data.username,
      status: "created",
      vestaResponse: result,
    };
  }

  /**
   * Delete hosting account
   */
  async deleteAccount(username) {
    await this.call("v-delete-user", { user: username });
    return { username, status: "deleted" };
  }

  /**
   * Suspend account (on non-payment)
   */
  async suspendAccount(username) {
    await this.call("v-suspend-user", { user: username });
    return { username, status: "suspended" };
  }

  /**
   * Unsuspend account (on payment received)
   */
  async unsuspendAccount(username) {
    await this.call("v-unsuspend-user", { user: username });
    return { username, status: "unsuspended" };
  }

  /**
   * Create domain for account
   */
  async createDomain(username, domainData) {
    const result = await this.call("v-add-domain", {
      user: username,
      domain: domainData.domain,
      ip: domainData.ip || "shared", // or specific IP
      namespace1: domainData.ns1 || "ns1.vestacp.local",
      namespace2: domainData.ns2 || "ns2.vestacp.local",
      nameserver3: domainData.ns3 || null,
      nameserver4: domainData.ns4 || null,
    });

    return {
      username,
      domain: domainData.domain,
      status: "created",
      vestaResponse: result,
    };
  }

  /**
   * Delete domain
   */
  async deleteDomain(username, domain) {
    await this.call("v-delete-domain", { user: username, domain });
    return { username, domain, status: "deleted" };
  }

  /**
   * Create email account
   */
  async createEmail(username, domain, emailData) {
    const result = await this.call("v-add-mail", {
      user: username,
      domain,
      account: emailData.account, // local part before @
      password: emailData.password,
      quota: emailData.quota || "100", // MB
    });

    return {
      username,
      domain,
      email: `${emailData.account}@${domain}`,
      status: "created",
      vestaResponse: result,
    };
  }

  /**
   * Delete email account
   */
  async deleteEmail(username, domain, account) {
    await this.call("v-delete-mail", {
      user: username,
      domain,
      account,
    });

    return { username, domain, email: `${account}@${domain}`, status: "deleted" };
  }

  /**
   * Create database
   */
  async createDatabase(username, dbData) {
    const result = await this.call("v-add-database", {
      user: username,
      database: dbData.name,
      dbuser: dbData.user,
      dbpass: dbData.password,
      type: dbData.type || "mysql", // mysql or pgsql
      charset: dbData.charset || "utf8",
    });

    return {
      username,
      database: dbData.name,
      status: "created",
      vestaResponse: result,
    };
  }

  /**
   * Delete database
   */
  async deleteDatabase(username, dbName) {
    await this.call("v-delete-database", {
      user: username,
      database: dbName,
    });

    return { username, database: dbName, status: "deleted" };
  }

  /**
   * Issue SSL certificate (Let's Encrypt)
   */
  async issueSSL(username, domain) {
    const result = await this.call("v-add-letsencrypt-domain", {
      user: username,
      domain,
    });

    return {
      username,
      domain,
      ssl: "letsencrypt",
      status: "issued",
      vestaResponse: result,
    };
  }

  /**
   * Get user stats (disk usage, traffic, etc)
   */
  async getUserStats(username) {
    // Note: VestaCP v-list-user returns user details
    // We'll need to parse the response or use v-get-user-report
    const result = await this.call("v-list-user", { user: username, json: "yes" });

    return {
      username,
      stats: result,
    };
  }

  /**
   * Get domain info
   */
  async getDomainInfo(username, domain) {
    const result = await this.call("v-list-domain", {
      user: username,
      domain,
      json: "yes",
    });

    return { username, domain, info: result };
  }

  /**
   * List all domains for user
   */
  async listDomains(username) {
    const result = await this.call("v-list-domains", {
      user: username,
      json: "yes",
    });

    return { username, domains: result };
  }

  /**
   * List all email accounts for domain
   */
  async listEmails(username, domain) {
    const result = await this.call("v-list-mail", {
      user: username,
      domain,
      json: "yes",
    });

    return { username, domain, emails: result };
  }

  /**
   * List all databases for user
   */
  async listDatabases(username) {
    const result = await this.call("v-list-databases", {
      user: username,
      json: "yes",
    });

    return { username, databases: result };
  }
  /**
   * Test connectivity by calling v-list-sys-info
   */
  async testConnection() {
    if (!this.configured) {
      throw new Error("VestaCP token not configured");
    }
    const info = await this.call("v-list-sys-info", { json: "yes" });
    return { connected: true, info };
  }
}

module.exports = new VestaCPClient();
module.exports.VestaCPClient = VestaCPClient;
