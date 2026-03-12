const BaseDriver = require("./base.driver");

class MockCloudDriver extends BaseDriver {
  async testConnection() {
    await this._delay(60, 180);
    return {
      status: "ok",
      latency: this._randomInt(2, 40),
      message: `Cloud node ${this.server.hostname} API reachable`,
    };
  }

  async createAccount({ domain, username, password }) {
    await this._delay(400, 900);
    return {
      success: true,
      account: {
        domain,
        username,
        password,
        region: "mock-us-east-1",
        instanceId: `i-${Math.random().toString(36).substr(2, 10)}`,
        message: "Cloud account container provisioned",
      },
    };
  }

  async suspendAccount(domain) {
    await this._delay(100, 200);
    return {
      success: true,
      domain,
      message: `Cloud instance for ${domain} suspended`,
    };
  }

  async terminateAccount(domain) {
    await this._delay(200, 400);
    return {
      success: true,
      domain,
      message: `Cloud instance for ${domain} terminated and resources released`,
    };
  }

  async getMetrics() {
    await this._delay(30, 100);
    return {
      cpuUsage: this._randomFloat(0.5, 70),
      ramUsage: this._randomFloat(5, 85),
      diskUsage: this._randomFloat(2, 60),
      uptime: this._randomInt(500, 5000000),
      serverType: "mock-cloud",
    };
  }

  async getAccountUsage(domain) {
    await this._delay(20, 80);
    return {
      diskUsedMB: this._randomInt(50, 3000),
      bandwidthUsedMB: this._randomInt(200, 50000),
      databaseUsed: this._randomInt(0, 3),
      emailUsed: this._randomInt(0, 5),
    };
  }

  getCapabilities() {
    return { ssl: true, backups: true, docker: true, nodejs: true, python: true, email: true };
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

module.exports = MockCloudDriver;
