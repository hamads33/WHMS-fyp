const BaseDriver = require("./base.driver");

class MockCpanelDriver extends BaseDriver {
  async testConnection() {
    await this._delay(100, 300);
    return {
      status: "ok",
      latency: this._randomInt(10, 80),
      message: `cPanel ${this.server.hostname} responded successfully`,
    };
  }

  async createAccount({ domain, username, password }) {
    await this._delay(200, 500);
    return {
      success: true,
      account: {
        domain,
        username,
        password,
        cpanelUrl: `https://${this.server.hostname}:2083`,
        message: "cPanel account created successfully",
      },
    };
  }

  async suspendAccount(domain) {
    await this._delay(100, 300);
    return {
      success: true,
      domain,
      message: `cPanel account for ${domain} suspended`,
    };
  }

  async terminateAccount(domain) {
    await this._delay(100, 300);
    return {
      success: true,
      domain,
      message: `cPanel account for ${domain} terminated`,
    };
  }

  async getMetrics() {
    await this._delay(50, 150);
    return {
      cpuUsage: this._randomFloat(5, 85),
      ramUsage: this._randomFloat(20, 90),
      diskUsage: this._randomFloat(10, 75),
      uptime: this._randomInt(100, 999999),
      serverType: "mock-cpanel",
    };
  }

  async getAccountUsage(domain) {
    await this._delay(50, 120);
    return {
      diskUsedMB: this._randomInt(100, 4000),
      bandwidthUsedMB: this._randomInt(500, 80000),
      databaseUsed: this._randomInt(0, 4),
      emailUsed: this._randomInt(0, 8),
    };
  }

  getCapabilities() {
    return { ssl: true, backups: true, docker: false, nodejs: false, python: false, email: true };
  }

  _delay(min, max) {
    return new Promise((r) =>
      setTimeout(r, this._randomInt(min, max))
    );
  }

  _randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  _randomFloat(min, max) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
  }
}

module.exports = MockCpanelDriver;
