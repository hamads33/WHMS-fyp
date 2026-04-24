const fs = require("fs");
const path = require("path");

/**
 * Location of role-based login policies
 * 
 * Structure example (JSON):
 * {
 *   "admin": {
 *     "allowedHours": { "start": "09:00", "end": "17:00" },
 *     "allowedIPs": ["1.1.1.1"],
 *     "forceMFA": true,
 *     "requireEmailVerified": true
 *   },
 *   "staff": { ... },
 *   "client": { ... }
 * }
 * 
 * Last role wins on merge.
 */
const POLICIES_PATH = path.join(__dirname, "..", "policies", "role-policies.json");

// --- Utility functions --------------------------------------------------------

function load() {
  try {
    if (!fs.existsSync(POLICIES_PATH)) {
      return {}; // no policies file exists
    }
    return JSON.parse(fs.readFileSync(POLICIES_PATH, "utf8"));
  } catch (err) {
    console.error("[RolePolicyService] Failed to load role policies:", err);
    return {};
  }
}

function save(policies) {
  try {
    fs.writeFileSync(POLICIES_PATH, JSON.stringify(policies, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("[RolePolicyService] Failed to save role policies:", err);
    return false;
  }
}

/**
 * Check if current time is within allowed time window.
 * */
function inTimeWindow(now, window) {
  if (!window || !window.start || !window.end) return true;

  const current = now.getHours() * 60 + now.getMinutes();

  const [sH, sM] = window.start.split(":").map(Number);
  const [eH, eM] = window.end.split(":").map(Number);

  const startMinutes = sH * 60 + sM;
  const endMinutes = eH * 60 + eM;

  return current >= startMinutes && current <= endMinutes;
}

// --- Main Policy Evaluation ----------------------------------------------------

const RolePolicyService = {
  load,
  save,

  /**
   * Evaluate role-based policy.
   *
   * @param {Array<string>} roles
   * @param {Object} ctx { ip, now, user }
   *
   * Returns:
   * {
   *   ok: boolean,
   *   reasons: [String],
   *   applied: { mergedRolePolicy }
   * }
   */
  evaluate(roles = [], ctx = {}) {
    const ip = ctx.ip || null;
    const now = ctx.now || new Date();
    const user = ctx.user || null;

    const policies = load();

    // Combined policy across all roles (last role wins)
    const mergedPolicy = {};
    for (const r of roles) {
      const p = policies[r];
      if (p) Object.assign(mergedPolicy, p);
    }

    const reasons = [];

    // --- 1) Hours check ---
    if (mergedPolicy.allowedHours) {
      const ok = inTimeWindow(now, mergedPolicy.allowedHours);
      if (!ok) {
        reasons.push(
          `Access allowed only between ${mergedPolicy.allowedHours.start} and ${mergedPolicy.allowedHours.end}`
        );
      }
    }

    // --- 2) IP check (exact match only — CIDR optional to add later) ---
    if (mergedPolicy.allowedIPs && Array.isArray(mergedPolicy.allowedIPs) && mergedPolicy.allowedIPs.length > 0) {
      if (!mergedPolicy.allowedIPs.includes(ip)) {
        reasons.push("Access denied from this IP");
      }
    }

    // --- 3) Require email verification ---
    if (mergedPolicy.requireEmailVerified && user && !user.isEmailVerified) {
      reasons.push("Email not verified");
    }

    // --- 4) Force MFA logic is *not* evaluated here (no blocking); 
    // it only instructs AuthService.login what to do.
    // AuthService.login handles:
    //   - user.mfaEnabled === false -> block
    // The policy engine itself only outputs the merged policy.

    return {
      ok: reasons.length === 0,
      reasons,
      applied: mergedPolicy
    };
  }
};

module.exports = RolePolicyService;
