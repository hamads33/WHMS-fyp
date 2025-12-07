// /**
//  * adminGuard(options?)
//  *
//  * Enforces:
//  *  - admin/staff/superadmin roles
//  *  - IP whitelist (optional)
//  *  - allowed hours (optional)
//  *  - MFA requirement (from profile)
//  *  - module-level restrictions (from profile + config)
//  *
//  * Uses data from req.user and req.user.adminProfile (from authGuard)
//  */

// function adminGuard(config = {}) {
//   const {
//     allowedIPs = null,       // Optional override: ["203.0.113.10"]
//     allowedHours = null,     // Optional override: { start: "09:00", end: "17:00" }
//     requiredModule = null    // e.g. "billing", "plugins", etc.
//   } = config;

//   return async (req, res, next) => {
//     try {
//       const user = req.user;

//       if (!user) {
//         return res.status(401).json({ error: "Not authenticated" });
//       }

//       ////////////////////////////////////////////////////////////
//       // 1. ROLE CHECK: Admin / Staff / Superadmin only
//       ////////////////////////////////////////////////////////////
//       const adminRoles = ["superadmin", "admin", "staff"];
//       const isAdmin = user.roles.some(r => adminRoles.includes(r));

//       if (!isAdmin) {
//         return res.status(403).json({ error: "Admins only" });
//       }

//       const adminProfile = user.adminProfile; // Now available from authGuard

//       if (!adminProfile) {
//         return res.status(403).json({ error: "Admin profile missing" });
//       }

//       // Combined restrictions:
//       // Config overrides take priority, but profile-level rules apply too.
//       const restrictions = adminProfile.restrictionJson || {};

//       ////////////////////////////////////////////////////////////
//       // 2. IP RESTRICTION
//       ////////////////////////////////////////////////////////////
//       const finalAllowedIPs = allowedIPs || restrictions.allowedIPs;

//       if (finalAllowedIPs && Array.isArray(finalAllowedIPs)) {
//         const requestIP = req.ip.replace("::ffff:", "").trim();

//         if (!finalAllowedIPs.includes(requestIP)) {
//           return res.status(403).json({
//             error: "Access denied from this IP",
//             yourIP: requestIP,
//             allowedIPs: finalAllowedIPs
//           });
//         }
//       }

//       ////////////////////////////////////////////////////////////
//       // 3. ALLOWED HOURS
//       ////////////////////////////////////////////////////////////
//       const finalHours = allowedHours || restrictions.workingHours;

//       if (finalHours && finalHours.start && finalHours.end) {
//         const now = new Date();
//         const current = now.getHours() * 60 + now.getMinutes();

//         const [sH, sM] = finalHours.start.split(":").map(Number);
//         const [eH, eM] = finalHours.end.split(":").map(Number);

//         const startMin = sH * 60 + sM;
//         const endMin = eH * 60 + eM;

//         if (current < startMin || current > endMin) {
//           return res.status(403).json({
//             error: `Access allowed only between ${finalHours.start} and ${finalHours.end}`
//           });
//         }
//       }

//       ////////////////////////////////////////////////////////////
//       // 4. FORCE MFA (Profile Controlled)
//       ////////////////////////////////////////////////////////////
//       if (restrictions.forceMFA === true) {
//         if (!user.mfaVerified) {
//           return res.status(403).json({
//             error: "MFA required",
//             mfaRequired: true
//           });
//         }
//       }

//       ////////////////////////////////////////////////////////////
//       // 5. MODULE RESTRICTION
//       ////////////////////////////////////////////////////////////
//       if (requiredModule) {
//         const blocked = restrictions.disabledModules || [];

//         if (Array.isArray(blocked) && blocked.includes(requiredModule)) {
//           return res.status(403).json({
//             error: `You are not allowed to access the ${requiredModule} module`
//           });
//         }
//       }

//       return next();
//     } catch (err) {
//       console.error("adminGuard error:", err);
//       return res.status(500).json({ error: "Admin guard failed" });
//     }
//   };
// }

// module.exports = { adminGuard };







/**
 * adminGuard(options?)
 *
 * Enforces:
 *  - Admin roles (superadmin, admin, staff)
 *  - Optional IP restriction
 *  - Optional allowed-hours access
 *  - Optional module restriction
 *  - Optional MFA enforcement (profile-level or global)
 *
 * Supports:
 *  - Debug mode (disable MFA/IP/etc)
 *
 * All restrictions come from:
 *  - options passed to adminGuard()
 *  - adminProfile.restrictionJson in DB
 */

function adminGuard(options = {}) {
  const {
    requireMFA = true,         // override MFA requirement
    allowedIPs = null,         // override whitelist
    allowedHours = null,       // override working hours
    requiredModule = null,     // require access to a module
    debugBypass = false        // disable ALL restrictions for development
  } = options;

  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      ////////////////////////////////////////////////////////////
      // DEBUG MODE (Safe for development only)
      ////////////////////////////////////////////////////////////
      if (debugBypass) {
        console.log("⚠️ adminGuard DEBUG MODE: All checks bypassed.");
        req.user.mfaVerified = true;
        return next();
      }

      ////////////////////////////////////////////////////////////
      // 1. ROLE CHECK
      ////////////////////////////////////////////////////////////
      const adminRoles = ["superadmin", "admin", "staff"];
      const hasAdminRole = (user.roles || []).some((r) => adminRoles.includes(r));

      if (!hasAdminRole) {
        return res.status(403).json({ error: "Admins only" });
      }

      ////////////////////////////////////////////////////////////
      // 2. Load Admin Profile Restrictions
      ////////////////////////////////////////////////////////////
      const profile = user.adminProfile || {};
      const restrictions = profile.restrictionJson || {};

      ////////////////////////////////////////////////////////////
      // 3. IP RESTRICTION
      ////////////////////////////////////////////////////////////
      const finalAllowedIPs = allowedIPs || restrictions.allowedIPs;

      if (finalAllowedIPs && Array.isArray(finalAllowedIPs)) {
        const clientIP = (req.ip || "").replace("::ffff:", "");

        if (!finalAllowedIPs.includes(clientIP)) {
          return res.status(403).json({
            error: "Access denied: IP not allowed",
            yourIP: clientIP,
            allowed: finalAllowedIPs
          });
        }
      }

      ////////////////////////////////////////////////////////////
      // 4. ALLOWED HOURS RESTRICTION
      ////////////////////////////////////////////////////////////
      const finalHours = allowedHours || restrictions.workingHours;

      if (finalHours && finalHours.start && finalHours.end) {
        const now = new Date();
        const totalMinutes = now.getHours() * 60 + now.getMinutes();

        const [sh, sm] = finalHours.start.split(":").map(Number);
        const [eh, em] = finalHours.end.split(":").map(Number);

        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;

        if (totalMinutes < startMin || totalMinutes > endMin) {
          return res.status(403).json({
            error: `Access allowed only between ${finalHours.start} and ${finalHours.end}`
          });
        }
      }

      ////////////////////////////////////////////////////////////
      // 5. MFA REQUIREMENT
      ////////////////////////////////////////////////////////////

      const mfaRequired = 
        (restrictions.forceMFA === true) ||  // Profile requires MFA
        requireMFA;                          // Global override requires MFA

      // OPTIONAL: Allow superadmin to bypass MFA
      if (user.roles.includes("superadmin")) {
        req.user.mfaVerified = true;
      }

      if (mfaRequired && !req.user.mfaVerified) {
        return res.status(403).json({
          error: "MFA required before accessing admin portal",
          mfaRequired: true
        });
      }

      ////////////////////////////////////////////////////////////
      // 6. MODULE RESTRICTION
      ////////////////////////////////////////////////////////////
      if (requiredModule) {
        const disabledModules = restrictions.disabledModules || [];

        if (Array.isArray(disabledModules) && disabledModules.includes(requiredModule)) {
          return res.status(403).json({
            error: `You are not allowed to access the "${requiredModule}" module`
          });
        }
      }

      ////////////////////////////////////////////////////////////
      // All checks passed
      ////////////////////////////////////////////////////////////
      return next();

    } catch (err) {
      console.error("adminGuard error:", err);
      return res.status(500).json({ error: "Admin guard failed" });
    }
  };
}

module.exports = { adminGuard };
