/**
 * HestiaCP API Driver (Modern REST API)
 * Path: src/modules/provisioning/drivers/hestia.driver.js
 *
 * Secure HTTPS integration with HestiaCP 8083+
 * Uses HMAC-SHA256 signed requests with Access Key + Secret Key
 *
 * Environment variables:
 *   HESTIA_HOST=servernode.whms.website
 *   HESTIA_PORT=8083
 *   HESTIA_ACCESS_KEY=PiEEQcvpcpOgCcdMCe0V
 *   HESTIA_TOKEN=<legacy MD5 token, fallback>
 *   HESTIA_REJECT_UNAUTHORIZED=false (dev) | true (prod)
 */

const https = require('https');
const crypto = require('crypto');
const querystring = require('querystring');

class HestiaDriver {
  constructor(override = {}) {
    this.host = override.host || process.env.HESTIA_HOST || 'localhost';
    this.port = Number(override.port || process.env.HESTIA_PORT || 8083);

    // Modern API credentials (preferred)
    this.accessKey = override.accessKey || process.env.HESTIA_ACCESS_KEY;
    this.secretKey = override.secretKey || process.env.HESTIA_SECRET_KEY;

    // Legacy token-based auth (fallback for older HestiaCP)
    this.token = override.token || process.env.HESTIA_TOKEN;

    // SECURITY: Enforce SSL verification by default
    const rejectUnauth = override.rejectUnauthorized ?? process.env.HESTIA_REJECT_UNAUTHORIZED ?? 'true';
    this.rejectUnauthorized = rejectUnauth === 'true' || rejectUnauth === true;

    this.requestTimeoutMs = Number(process.env.HESTIA_REQUEST_TIMEOUT || 15000);

    if (!this.accessKey && !this.secretKey && !this.token) {
      console.warn('[HestiaCP] No authentication configured — provisioning disabled');
    }
  }

  get configured() {
    return !!(this.accessKey && this.secretKey) || !!this.token;
  }

  /**
   * Legacy MD5 hash generation for old HestiaCP API
   */
  _generateHash(timestamp = null) {
    if (!this.token) throw new Error('Token not configured');
    if (timestamp === null) {
      timestamp = Math.floor(Date.now() / 1000);
    }
    const data = `${this.token}${timestamp}`;
    return crypto.createHash('md5').update(data).toString('hex');
  }

  /**
   * Modern HMAC-SHA256 signature generation for REST API
   */
  _generateSignature(method, path, body, timestamp) {
    if (!this.secretKey) throw new Error('Secret Key not configured');

    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body || {});
    const signatureString = [method, path, bodyStr, this.accessKey, timestamp].join('\n');

    return crypto
      .createHmac('sha256', this.secretKey)
      .update(signatureString)
      .digest('base64');
  }

  /**
   * Make API call - tries modern REST API first, falls back to legacy
   */
  async call(cmd, args = {}, retryCount = 0) {
    // Try modern API first if we have both keys
    if (this.accessKey && this.secretKey) {
      try {
        return await this._callModernAPI(cmd, args, retryCount);
      } catch (err) {
        console.warn(`[HestiaCP] Modern API (/api/v1/${cmd}) failed:`, err.message);
        if (!this.token) throw err;
        // Fall through to legacy API
      }
    }

    // Fall back to legacy MD5-based API
    if (this.token || this.accessKey) {
      try {
        return await this._callLegacyAPI(cmd, args, retryCount);
      } catch (err) {
        console.warn(`[HestiaCP] Legacy API (/api/cmd/) failed:`, err.message);
        throw err;
      }
    }

    throw new Error('No authentication method configured');
  }

  /**
   * Modern REST API call with HMAC-SHA256
   */
  async _callModernAPI(cmd, args = {}, retryCount = 0) {
    return new Promise((resolve, reject) => {
      const maxRetries = 2;
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const path = `/api/v1/${cmd}`;
      const method = 'POST';
      const bodyObj = args;
      const bodyStr = JSON.stringify(bodyObj);

      const signature = this._generateSignature(method, path, bodyStr, timestamp);

      const options = {
        hostname: this.host,
        port: this.port,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
          'X-Access-Key': this.accessKey,
          'X-Signature': signature,
          'X-Timestamp': timestamp,
        },
        rejectUnauthorized: this.rejectUnauthorized,
        timeout: this.requestTimeoutMs,
      };

      let responseData = '';
      let hasResolved = false;

      const req = https.request(options, (res) => {
        if (!hasResolved) {
          res.on('data', (chunk) => {
            responseData += chunk;
          });

          res.on('end', () => {
            if (hasResolved) return;
            hasResolved = true;

            try {
              const result = this._parseModernResponse(responseData);
              if (result.error) {
                const err = new Error(result.error);
                err.statusCode = 400;
                return reject(err);
              }
              resolve(result);
            } catch (parseErr) {
              reject(parseErr);
            }
          });
        }
      });

      req.on('timeout', () => {
        if (hasResolved) return;
        hasResolved = true;
        req.destroy();

        if (retryCount < maxRetries) {
          const delayMs = Math.pow(2, retryCount) * 1000;
          setTimeout(() => {
            this._callModernAPI(cmd, args, retryCount + 1).then(resolve).catch(reject);
          }, delayMs);
        } else {
          reject(new Error(`HestiaCP request timeout after ${maxRetries} retries`));
        }
      });

      req.on('error', (err) => {
        if (hasResolved) return;
        hasResolved = true;

        if (retryCount < maxRetries) {
          const delayMs = Math.pow(2, retryCount) * 1000;
          setTimeout(() => {
            this._callModernAPI(cmd, args, retryCount + 1).then(resolve).catch(reject);
          }, delayMs);
        } else {
          reject(new Error(`HestiaCP API error: ${err.message}`));
        }
      });

      req.write(bodyStr);
      req.end();
    });
  }

  /**
   * Legacy API call with MD5 authentication
   */
  async _callLegacyAPI(cmd, args = {}, retryCount = 0) {
    return new Promise((resolve, reject) => {
      const maxRetries = 2;
      const timestamp = Math.floor(Date.now() / 1000);
      const hash = this._generateHash(timestamp);

      const body = querystring.stringify({
        cmd,
        hash,
        timestamp,
        ...args,
      });

      const options = {
        hostname: this.host,
        port: this.port,
        path: '/api/cmd/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
        rejectUnauthorized: this.rejectUnauthorized,
        timeout: this.requestTimeoutMs,
      };

      let responseData = '';
      let hasResolved = false;

      const req = https.request(options, (res) => {
        if (!hasResolved) {
          res.on('data', (chunk) => {
            responseData += chunk;
          });

          res.on('end', () => {
            if (hasResolved) return;
            hasResolved = true;

            try {
              const result = this._parseLegacyResponse(responseData);
              if (result.error) {
                const err = new Error(result.error);
                err.statusCode = 400;
                return reject(err);
              }
              resolve(result);
            } catch (parseErr) {
              reject(parseErr);
            }
          });
        }
      });

      req.on('timeout', () => {
        if (hasResolved) return;
        hasResolved = true;
        req.destroy();

        if (retryCount < maxRetries) {
          const delayMs = Math.pow(2, retryCount) * 1000;
          setTimeout(() => {
            this._callLegacyAPI(cmd, args, retryCount + 1).then(resolve).catch(reject);
          }, delayMs);
        } else {
          reject(new Error(`HestiaCP request timeout after ${maxRetries} retries`));
        }
      });

      req.on('error', (err) => {
        if (hasResolved) return;
        hasResolved = true;

        if (retryCount < maxRetries) {
          const delayMs = Math.pow(2, retryCount) * 1000;
          setTimeout(() => {
            this._callLegacyAPI(cmd, args, retryCount + 1).then(resolve).catch(reject);
          }, delayMs);
        } else {
          reject(new Error(`HestiaCP API error: ${err.message}`));
        }
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * Parse modern REST API response (JSON)
   */
  _parseModernResponse(data) {
    if (!data || typeof data !== 'string') {
      throw new Error('Invalid response: empty data');
    }

    try {
      const parsed = JSON.parse(data.trim());

      if (parsed.error || parsed.status === 'error') {
        return {
          error: parsed.error || parsed.message || 'Unknown error'
        };
      }

      return { success: true, data: parsed };
    } catch (e) {
      throw new Error('Invalid JSON response: ' + data.substring(0, 100));
    }
  }

  /**
   * Parse legacy API response (pipe-delimited)
   */
  _parseLegacyResponse(data) {
    if (!data || typeof data !== 'string') {
      throw new Error('Invalid response: empty data');
    }

    const trimmed = data.trim();

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return { success: true, data: parsed };
      } catch (e) {
        // Not JSON, continue
      }
    }

    const lines = trimmed.split('\n');
    const firstLine = lines[0];

    if (firstLine.startsWith('error|') || firstLine.startsWith('error')) {
      const msg = firstLine.replace(/^error\|?/, '').trim() || 'Unknown error from HestiaCP';
      return { error: msg };
    }

    if (firstLine.startsWith('ok|') || firstLine.startsWith('ok')) {
      return { success: true, data: lines };
    }

    throw new Error('Invalid response format');
  }

  /**
   * Validate username
   */
  _validateUsername(username) {
    if (!username || username.length < 3 || username.length > 16) {
      throw new Error('Username must be 3-16 characters');
    }
    if (!/^[a-z0-9-]+$/i.test(username)) {
      throw new Error('Username can only contain alphanumeric and hyphen');
    }
    return true;
  }

  /**
   * Validate domain
   */
  _validateDomain(domain) {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      throw new Error('Invalid domain format');
    }
    return true;
  }

  /**
   * Create hosting account
   */
  async createUser(data) {
    this._validateUsername(data.username);

    const result = await this.call('v-add-user', {
      user: data.username,
      password: data.password,
      email: data.email,
      fname: (data.firstName || data.username).substring(0, 32),
      lname: (data.lastName || '').substring(0, 32),
    });

    return {
      success: true,
      username: data.username,
      email: data.email,
      status: 'created',
    };
  }

  /**
   * Delete hosting account
   */
  async deleteUser(username) {
    this._validateUsername(username);
    await this.call('v-delete-user', { user: username });
    return { success: true, username, status: 'deleted' };
  }

  /**
   * Suspend account
   */
  async suspendUser(username) {
    this._validateUsername(username);
    await this.call('v-suspend-user', { user: username });
    return { success: true, username, status: 'suspended' };
  }

  /**
   * Unsuspend account
   */
  async unsuspendUser(username) {
    this._validateUsername(username);
    await this.call('v-unsuspend-user', { user: username });
    return { success: true, username, status: 'unsuspended' };
  }

  /**
   * Create domain
   */
  async createDomain(username, domainData) {
    this._validateUsername(username);
    this._validateDomain(domainData.domain);

    const result = await this.call('v-add-domain', {
      user: username,
      domain: domainData.domain,
      ip: domainData.ip || 'shared',
    });

    return {
      success: true,
      username,
      domain: domainData.domain,
      status: 'created',
    };
  }

  /**
   * Delete domain
   */
  async deleteDomain(username, domain) {
    this._validateUsername(username);
    this._validateDomain(domain);
    await this.call('v-delete-domain', { user: username, domain });
    return { success: true, username, domain, status: 'deleted' };
  }

  /**
   * Create database
   */
  async createDatabase(username, dbData) {
    this._validateUsername(username);

    const result = await this.call('v-add-database', {
      user: username,
      database: dbData.name,
      dbuser: dbData.user,
      dbpass: dbData.password,
      type: (dbData.type || 'mysql').toLowerCase(),
      charset: (dbData.charset || 'utf8mb4').toLowerCase(),
    });

    return {
      success: true,
      username,
      database: dbData.name,
      status: 'created',
    };
  }

  /**
   * Delete database
   */
  async deleteDatabase(username, dbName) {
    this._validateUsername(username);
    await this.call('v-delete-database', {
      user: username,
      database: dbName,
    });
    return { success: true, username, database: dbName, status: 'deleted' };
  }

  /**
   * Issue SSL certificate
   */
  async issueSSL(username, domain) {
    this._validateUsername(username);
    this._validateDomain(domain);

    await this.call('v-add-letsencrypt-domain', {
      user: username,
      domain,
    });

    return {
      success: true,
      username,
      domain,
      ssl: 'letsencrypt',
      status: 'issued',
    };
  }

  /**
   * Create email account
   */
  async createMail(username, domain, emailData) {
    this._validateUsername(username);
    this._validateDomain(domain);

    const result = await this.call('v-add-mail', {
      user: username,
      domain,
      account: emailData.account,
      password: emailData.password,
      quota: String(emailData.quota || 100),
    });

    return {
      success: true,
      username,
      domain,
      email: `${emailData.account}@${domain}`,
      status: 'created',
    };
  }

  /**
   * Delete email account
   */
  async deleteMail(username, domain, account) {
    this._validateUsername(username);
    this._validateDomain(domain);

    await this.call('v-delete-mail', {
      user: username,
      domain,
      account,
    });

    return {
      success: true,
      username,
      domain,
      email: `${account}@${domain}`,
      status: 'deleted',
    };
  }

  /**
   * List users
   */
  async listUsers() {
    const result = await this.call('v-list-users', { json: 'yes' });
    return { success: true, users: result };
  }

  /**
   * Get user info
   */
  async getUser(username) {
    this._validateUsername(username);
    const result = await this.call('v-list-user', {
      user: username,
      json: 'yes',
    });
    return { success: true, username, data: result };
  }

  /**
   * Get user stats
   */
  async getUserStats(username) {
    this._validateUsername(username);
    const result = await this.call('v-list-user', {
      user: username,
      json: 'yes',
    });
    return {
      success: true,
      username,
      stats: result[0] || {},
    };
  }

  /**
   * List domains for user
   */
  async listDomains(username) {
    this._validateUsername(username);
    const result = await this.call('v-list-domains', {
      user: username,
      json: 'yes',
    });
    return { success: true, username, domains: result };
  }

  /**
   * List databases for user
   */
  async listDatabases(username) {
    this._validateUsername(username);
    const result = await this.call('v-list-databases', {
      user: username,
      json: 'yes',
    });
    return { success: true, username, databases: result };
  }

  /**
   * Test connection
   */
  async testConnection() {
    if (!this.configured) {
      throw new Error('HestiaCP credentials not configured');
    }
    try {
      const result = await this.call('v-list-sys-info', {});

      if (!result.success) {
        throw new Error('API returned error: ' + result.error);
      }

      return {
        connected: true,
        success: true,
        verified: true,
        message: 'HestiaCP API connection verified'
      };
    } catch (err) {
      const errorMsg = err.message || 'Connection failed';
      throw new Error(`HestiaCP verification failed: ${errorMsg}`);
    }
  }
}

module.exports = new HestiaDriver();
module.exports.HestiaDriver = HestiaDriver;
