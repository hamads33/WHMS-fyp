const { Router } = require("express");
const ApiKeyController = require("../controllers/apiKey.controller");
const  authGuard  = require("../middlewares/auth.guard");

const router = Router();

router.post("/", authGuard, ApiKeyController.create);
router.get("/", authGuard, ApiKeyController.list);
router.delete("/:keyId", authGuard, ApiKeyController.revoke);

module.exports = router;
