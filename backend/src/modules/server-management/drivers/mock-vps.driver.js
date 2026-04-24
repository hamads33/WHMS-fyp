const BaseDriver = require("./base.driver");

class MockVpsDriver extends BaseDriver {
  async testConnection() {
    await this._delay(80, 250);
    return {
      status: "ok",
      latency: this._randomInt(5, 60),
      message: `VPS ${this.server.hostname} SSH handshake successful`,
    };
  }

  async createAccount({ domain, username, password }) {
    await this._delay(300, 700);
    return {
      success: true,
      account: {
        domain,
        username,
        password,
        sshPort: 22,
        webRoot: `/var/www/${domain}/public_html`,
        message: "VPS account provisioned successfully",
      },
    };
  }

  async suspendAccount(domain) {
    await this._delay(100, 250);
    return {
      success: true,
      domain,
      message: `VPS account for ${domain} suspended via iptables`,
    };
  }

  async terminateAccount(domain) {
    await this._delay(150, 350);
    return {
      success: true,
      domain,
      message: `VPS account for ${domain} removed`,
    };
  }

  async getMetrics() {
    await this._delay(50, 120);
    return {
      cpuUsage: this._randomFloat(1, 95),
      ramUsage: this._randomFloat(10, 88),
      diskUsage: this._randomFloat(5, 80),
      uptime: this._randomInt(1000, 9999999),
      serverType: "mock-vps",
    };
  }

  async getAccountUsage(domain) {
    await this._delay(40, 100);
    return {
      diskUsedMB: this._randomInt(200, 4800),
      bandwidthUsedMB: this._randomInt(1000, 95000),
      databaseUsed: this._randomInt(0, 5),
      emailUsed: this._randomInt(0, 10),
    };
  }

  getCapabilities() {
    return { ssl: true, backups: true, docker: true, nodejs: true, python: true, email: false };
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

module.exports = MockVpsDriver;
