console.log("🧪 MOCK REGISTRAR LOADED");

module.exports = {
  /**
   * Availability check (for registration)
   */
  async checkAvailability(input) {
    const domain =
      typeof input === "string" ? input : input?.domain;

    return {
      domain,
      available: !domain.includes("taken"),
      premium: false,
      price: 10
    };
  },

  /**
   * Domain registration
   */
  async registerDomain({ domain, years }) {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + years);

    return {
      success: true,
      domain,
      expiryDate,
      price: 10
    };
  },

  /**
   * WHOIS / contacts sync
   */
  async updateContacts({ domain, contacts }) {
    return {
      success: true,
      domain,
      contactsSynced: true
    };
  },

  /**
   * Transfer eligibility check (SEPARATE from availability)
   */
  async checkTransferAvailability(domain) {
    return {
      domain,
      transferable: true,
      reason: "Domain registered at another registrar"
    };
  },

  /**
   * Transfer initiation (EPP)
   */
  async transferDomain({ domain, authCode }) {
    if (!authCode) {
      return { success: false, error: "Missing auth code" };
    }

    return {
      success: true,
      status: "pending"
    };
  },

  /**
   * DNS sync
   */
  async updateDNSRecords(domain) {
    return {
      success: true,
      domain,
      synced: true
    };
  },

  /**
   * Registrar polling / sync
   */
  async syncDomain(domain) {
    return {
      status: "active",
      expiryDate: new Date(
        new Date().setFullYear(new Date().getFullYear() + 1)
      )
    };
  },
  async renewDomain({ domain, years }) {
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + years);

  return {
    success: true,
    domain,
    expiryDate
  };
}

};
