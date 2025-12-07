const { Router } = require("express");
const PasswordController = require("../controllers/password.controller");

const router = Router();

// request email
router.post("/request-reset", PasswordController.requestReset);

// user clicks email link
router.get("/reset", PasswordController.verifyPage);

// submit new password
router.post("/reset", PasswordController.reset);

module.exports = router;
