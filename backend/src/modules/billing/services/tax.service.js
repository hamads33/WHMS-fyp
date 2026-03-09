/**
 * Tax Service
 * Path: src/modules/billing/services/tax.service.js
 * FR-07: Dynamic tax calculation based on rules, regions, service types
 */

const prisma = require("../../../../prisma");

class TaxService {
  /**
   * Find applicable tax rule for a client/service combination
   * ✅ FIXED: Now logs which rule was applied for audit trail
   */
  async getApplicableRate(clientId, serviceCode = null) {
    // Get billing profile for region info
    const profile = await prisma.billingProfile.findUnique({
      where: { clientId },
    });

    const country = profile?.country || null;
    const region = profile?.region || null;

    // Priority: most-specific rule first
    // 1. country + region + serviceCode
    // 2. country + serviceCode
    // 3. country only
    // 4. global (no country)
    const candidates = await prisma.taxRule.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });

    const match =
      candidates.find(
        (r) =>
          r.country === country &&
          r.region === region &&
          r.serviceType === serviceCode
      ) ||
      candidates.find(
        (r) => r.country === country && r.serviceType === serviceCode
      ) ||
      candidates.find(
        (r) => r.country === country && r.serviceType === null
      ) ||
      candidates.find((r) => r.country === null && r.serviceType === null) ||
      null;

    // ✅ NEW: Add logging for audit trail
    if (!match) {
      console.warn(
        `[TAX] No applicable tax rule found for:`,
        { clientId, country, region, serviceCode },
        `Using 0% tax (default).`
      );
      return 0;
    }

    // ✅ NEW: Log which rule was applied
    console.debug(
      `[TAX] Applied rule for clientId=${clientId}:`,
      {
        ruleId: match.id,
        ruleName: match.name,
        rate: match.rate,
        country: match.country,
        region: match.region,
        serviceType: match.serviceType,
      }
    );

    return parseFloat(match.rate);
  }

  /**
   * List all tax rules (admin)
   */
  async listAll() {
    return prisma.taxRule.findMany({ orderBy: { createdAt: "desc" } });
  }

  /**
   * Create tax rule
   */
  async create(data) {
    return prisma.taxRule.create({
      data: {
        name: data.name,
        rate: data.rate,
        country: data.country || null,
        region: data.region || null,
        serviceType: data.serviceType || null,
        active: data.active !== undefined ? data.active : true,
      },
    });
  }

  /**
   * Update tax rule
   */
  async update(id, data) {
    const rule = await prisma.taxRule.findUnique({ where: { id } });
    if (!rule) {
      const err = new Error("Tax rule not found");
      err.statusCode = 404;
      throw err;
    }
    return prisma.taxRule.update({ where: { id }, data });
  }

  /**
   * Delete tax rule (soft delete - mark inactive)
   */
  async delete(id) {
    const rule = await prisma.taxRule.findUnique({ where: { id } });
    if (!rule) {
      const err = new Error("Tax rule not found");
      err.statusCode = 404;
      throw err;
    }
    return prisma.taxRule.update({ where: { id }, data: { active: false } });
  }
}

module.exports = new TaxService();