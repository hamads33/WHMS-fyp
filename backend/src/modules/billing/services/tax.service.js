/**
 * Tax Service
 * Path: src/modules/billing/services/tax.service.js
 *
 * Resolves applicable tax rules based on client billing profile,
 * country, and service type. Supports layered tax specificity:
 *   country + serviceType > country only > global (no country)
 */

const prisma = require("../../../../prisma");
const { toCurrency } = require("../utils/billing.util");

class TaxService {
  // ============================================================
  // TAX RULE MANAGEMENT (Admin)
  // ============================================================

  /**
   * Create a tax rule.
   */
  async create(data, actor) {
    const rule = await prisma.taxRule.create({
      data: {
        name: data.name,
        rate: data.rate,
        country: data.country || null,
        region: data.region || null,
        serviceType: data.serviceType || null,
        active: true,
      },
    });

    return rule;
  }

  /**
   * Update a tax rule.
   */
  async update(id, data, actor) {
    await this.getById(id);

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.rate !== undefined) updateData.rate = data.rate;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.region !== undefined) updateData.region = data.region;
    if (data.serviceType !== undefined) updateData.serviceType = data.serviceType;
    if (data.active !== undefined) updateData.active = data.active;

    if (Object.keys(updateData).length === 0) {
      const err = new Error("No fields to update");
      err.statusCode = 400;
      throw err;
    }

    return prisma.taxRule.update({ where: { id }, data: updateData });
  }

  /**
   * Delete a tax rule.
   */
  async delete(id, actor) {
    await this.getById(id);
    await prisma.taxRule.delete({ where: { id } });
    return { message: "Tax rule deleted" };
  }

  /**
   * Get tax rule by ID.
   */
  async getById(id) {
    const rule = await prisma.taxRule.findUnique({ where: { id } });

    if (!rule) {
      const err = new Error("Tax rule not found");
      err.statusCode = 404;
      throw err;
    }

    return rule;
  }

  /**
   * List all tax rules.
   */
  async listAll(activeOnly = false) {
    return prisma.taxRule.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: [{ country: "asc" }, { serviceType: "asc" }],
    });
  }

  // ============================================================
  // TAX CALCULATION
  // ============================================================

  /**
   * Resolve the best-matching tax rule for a client.
   *
   * Priority order (most specific wins):
   *   1. country + serviceType match
   *   2. country match, no serviceType restriction
   *   3. global rule (no country)
   *
   * @param {string} clientId
   * @param {string|null} serviceType - e.g. "hosting", "ssl", "domain"
   * @returns {{ rule: Object|null, rate: number }}
   */
  async resolveRule(clientId, serviceType = null) {
    const profile = await prisma.billingProfile.findUnique({
      where: { clientId },
    });

    const country = profile?.country || null;

    // Fetch all active rules that could apply
    const candidates = await prisma.taxRule.findMany({
      where: {
        active: true,
        OR: [
          // Exact country + serviceType
          { country, serviceType },
          // Country match, no serviceType restriction
          { country, serviceType: null },
          // Global rules (no country restriction)
          { country: null, serviceType: null },
          { country: null, serviceType },
        ],
      },
      orderBy: { rate: "desc" },
    });

    // Pick most specific rule
    const rule = this._pickBestRule(candidates, country, serviceType);

    return {
      rule,
      rate: rule ? parseFloat(rule.rate) : 0,
    };
  }

  /**
   * Calculate tax amount for a subtotal.
   *
   * @param {number} subtotal
   * @param {string} clientId
   * @param {string|null} serviceType
   * @returns {{ taxAmount: number, taxRate: number, rule: Object|null }}
   */
  async calculate(subtotal, clientId, serviceType = null) {
    const { rule, rate } = await this.resolveRule(clientId, serviceType);
    const taxAmount = toCurrency(subtotal * rate);

    return {
      taxAmount,
      taxRate: rate,
      rule,
    };
  }

  /**
   * Calculate tax for a flat rate (no client lookup).
   * Used when tax rate is already known (e.g. from snapshot).
   *
   * @param {number} subtotal
   * @param {number} rate - Decimal rate (e.g. 0.17 for 17%)
   * @returns {number}
   */
  calculateFlat(subtotal, rate) {
    return toCurrency(subtotal * parseFloat(rate || 0));
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  /**
   * Pick the most specific tax rule from a set of candidates.
   * Specificity: country+serviceType > country > global
   */
  _pickBestRule(candidates, country, serviceType) {
    if (!candidates.length) return null;

    // Score each candidate by specificity
    const scored = candidates.map((rule) => {
      let score = 0;
      if (rule.country && rule.country === country) score += 2;
      if (rule.serviceType && rule.serviceType === serviceType) score += 1;
      return { rule, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].rule;
  }
}

module.exports = new TaxService();