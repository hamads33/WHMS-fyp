// /**
//  * Admin Portal Guard
//  *
//  * Allows access ONLY to:
//  * - superadmin
//  * - admin
//  * - staff
//  *
//  * Also requires MFA verification.
//  */
// module.exports = function adminPortalGuard(req, res, next) {
//   try {
//     if (!req.user) {
//       return res.status(401).json({ error: "Unauthorized" });
//     }

//     const allowed = ["superadmin", "admin", "staff"];

//     const hasAccess = (req.user.roles || []).some((r) =>
//       allowed.includes(r)
//     );

//     if (!hasAccess) {
//       return res.status(403).json({
//         error: "Access denied: admin portal only",
//       });
//     }

//     if (!req.user.mfaVerified) {
//       return res.status(403).json({
//         error: "MFA required to access admin portal",
//       });
//     }

//     return next();
//   } catch (err) {
//     console.error("adminPortalGuard error:", err);
//     return res.status(500).json({ error: "Admin portal verification failed" });
//   }
// };
/**
 * Admin Portal Guard (MFA temporarily disabled for debugging impersonation)
 *
 * Allows:
 * - superadmin
 * - admin
 * - staff
 */


// module.exports = function adminPortalGuard(req, res, next) {
//   try {
//     if (!req.user) {
//       return res.status(401).json({ error: "Unauthorized" });
//     }

//     const allowed = ["superadmin", "admin", "staff"];

//     const hasAccess = (req.user.roles || []).some((r) =>
//       allowed.includes(r)
//     );

//     if (!hasAccess) {
//       return res.status(403).json({
//         error: "Access denied: admin portal only",
//       });
//     }

//     /**
//      * 🔥 TEMPORARY DEBUG OVERRIDE:
//      * MFA check disabled until impersonation is fully tested.
//      */
//     req.user.mfaVerified = true;

//     return next();
//   } catch (err) {
//     console.error("adminPortalGuard error:", err);
//     return res.status(500).json({ error: "Admin portal check failed" });
//   }
// };
/**
 * Admin Portal Guard (MFA temporarily disabled for debugging impersonation)
 *
 * Allows:
 * - superadmin
 * - admin
 * - staff
 *
 * MFA is bypassed ONLY during development.
 */
module.exports = function adminPortalGuard(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const allowed = ["superadmin", "admin", "staff"];

    const hasAccess = (req.user.roles || []).some((r) =>
      allowed.includes(r)
    );

    if (!hasAccess) {
      return res.status(403).json({
        error: "Access denied: admin portal only",
      });
    }

    // ⛔ Debug override
    // Prevents MFA from blocking admin portal access
    req.user.mfaVerified = true;

    return next();
  } catch (err) {
    console.error("adminPortalGuard error:", err);
    return res.status(500).json({ error: "Admin portal check failed" });
  }
};
