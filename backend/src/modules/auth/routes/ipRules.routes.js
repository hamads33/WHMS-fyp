const { Router } = require("express");
const router = Router();

const authGuard = require("../middlewares/auth.guard");
const adminGuard = require("../middlewares/admin.guard"); // must be a function
const IpRulesController = require("../controllers/ipRules.controller");
router.post(
  "/",
  authGuard,
  adminGuard({ requireMFA: false }),   
  IpRulesController.create
);

router.get(
  "/",
  authGuard,
  adminGuard({ requireMFA: false }),   
  IpRulesController.list
);

router.patch(
  "/:id",
  authGuard,
  adminGuard({ requireMFA: false }),   
  IpRulesController.update
);

router.delete(
  "/:id",
  authGuard,
  adminGuard({ requireMFA: false }),   
  IpRulesController.remove
);

module.exports = router;
