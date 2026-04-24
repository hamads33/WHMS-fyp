/**
 * Rules defining WHO can impersonate WHO.
 *
 * You can expand or adjust this anytime.
 */
const ImpersonationRules = {
  // Superadmin can impersonate anyone
  superadmin: {
    can: ["admin", "staff", "reseller", "developer", "client"],
  },

  // Admin can impersonate limited roles
  admin: {
    can: ["staff", "reseller", "developer", "client"],
  },

  // Staff can impersonate ONLY clients
  staff: {
    can: ["client"],
  },

  // No other roles may impersonate
  default: {
    can: [],
  },
};

function canImpersonate(sourceRoles = [], targetRoles = []) {
  // determine highest privilege source role
  const order = ["superadmin", "admin", "staff", "reseller", "developer", "client"];
  const src = sourceRoles
    .filter((r) => order.includes(r))
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))[0];

  const rule = ImpersonationRules[src] || ImpersonationRules.default;

  return targetRoles.some((t) => rule.can.includes(t));
}

module.exports = { ImpersonationRules, canImpersonate };
