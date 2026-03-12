class BaseDriver {
  constructor(server) {
    if (new.target === BaseDriver) {
      throw new Error("BaseDriver is abstract");
    }
    this.server = server;
  }

  async testConnection() {
    throw new Error("testConnection() must be implemented");
  }

  async createAccount(payload) {
    throw new Error("createAccount() must be implemented");
  }

  async suspendAccount(domain) {
    throw new Error("suspendAccount() must be implemented");
  }

  async terminateAccount(domain) {
    throw new Error("terminateAccount() must be implemented");
  }

  async getMetrics() {
    throw new Error("getMetrics() must be implemented");
  }

  async getAccountUsage(domain) {
    throw new Error("getAccountUsage() must be implemented");
  }

  getCapabilities() {
    return this.server.capabilities ?? {
      ssl: true, backups: true, docker: false,
      nodejs: false, python: false, email: true,
    };
  }
}

module.exports = BaseDriver;
