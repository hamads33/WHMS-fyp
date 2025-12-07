/**
 * Unified Portal Installer
 *
 * Automatically wires:
 *  /admin
 *  /client
 *  /reseller
 *  /developer
 */
const { authGuard } = require("../middlewares/auth.guard");

const adminPortalGuard = require("../guards/adminPortal.guard");
const clientPortalGuard = require("../guards/clientPortal.guard");
const resellerPortalGuard = require("../guards/resellerPortal.guard");
const developerPortalGuard = require("../guards/developerPortal.guard");

module.exports = function installPortals(app) {
  // Admin
  app.use(
    "/admin",
    authGuard,
    adminPortalGuard,
    require("../../admin/routes")
  );

  // Client
  app.use(
    "/client",
    authGuard,
    clientPortalGuard,
    require("../../client/routes")
  );

  // Reseller
  app.use(
    "/reseller",
    authGuard,
    resellerPortalGuard,
    require("../../reseller/routes")
  );

  // Developer
  app.use(
    "/developer",
    authGuard,
    developerPortalGuard,
    require("../../developer/routes")
  );
};
