// src/modules/auth/services/ipAccess.service.js
const prisma = require("../../../../prisma");
const ipRangeCheck = require("ip-range-check");

/**
 * Logic:
 * - If any DENY rule (active) matches the IP -> denied (true)
 * - Else if any ALLOW rule matches -> allowed (false denied)
 * - Else -> allowed (false denied)
 *
 * Returns boolean: true = denied, false = allowed.
 */

const IpAccessService = {
  async createRule({ pattern, type, description, createdById }) {
    const rule = await prisma.ipAccessRule.create({
      data: { pattern, type, description, createdById, active: true },
    });
    return rule;
  },

  async listRules({ activeOnly = false } = {}) {
    const where = activeOnly ? { active: true } : {};
    return prisma.ipAccessRule.findMany({ where, orderBy: { createdAt: "desc" } });
  },

  async getRule(id) {
    return prisma.ipAccessRule.findUnique({ where: { id } });
  },

  async updateRule(id, patch) {
    return prisma.ipAccessRule.update({ where: { id }, data: patch });
  },

  async deleteRule(id) {
    return prisma.ipAccessRule.delete({ where: { id } });
  },

  // Core decision function
  async isIpDenied(ip) {
    if (!ip) return false;

    const rules = await prisma.ipAccessRule.findMany({ where: { active: true } });
    if (!rules || rules.length === 0) return false;

    // Normalize ipRangeCheck expects string pattern(s)
    // Check DENY first
    const denyRules = rules.filter(r => r.type === "DENY");
    for (const r of denyRules) {
      if (ipRangeCheck(ip, r.pattern)) return true; // denied
    }

    // Then check ALLOW (if you want whitelist semantics)
    const allowRules = rules.filter(r => r.type === "ALLOW");
    if (allowRules.length > 0) {
      // If there are any allow rules, require match to allow; otherwise deny.
      for (const r of allowRules) {
        if (ipRangeCheck(ip, r.pattern)) return false; // allowed
      }
      // No allow matched -> default deny when allow rules exist
      return true;
    }

    // No allow rules exist and no deny matched => allowed
    return false;
  }
};

module.exports = IpAccessService;
