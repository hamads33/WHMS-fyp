// // src/modules/auth/routes/ipRules.routes.js
// const { Router } = require("express");
// const router = Router();
// const IpRulesController = require("../controllers/ipRules.controller");

// // Protect with admin guard (you likely have one). Use authGuard + admin check
// const authGuard = require("../middlewares/auth.guard");
// const adminGuard = require("../middlewares/admin.guard") || ((req,res,next)=> next()); // replace admin.guard if you have

// // Create
// router.post("/", authGuard, adminGuard, IpRulesController.create);

// // List
// router.get("/", authGuard, adminGuard, IpRulesController.list);

// // Update (partial)
// router.patch("/:id", authGuard, adminGuard, IpRulesController.update);

// // Delete
// router.delete("/:id", authGuard, adminGuard, IpRulesController.remove);

// module.exports = router;

// src/modules/auth/routes/ipRules.routes.js

const router = require("express").Router();
const IpRulesController = require("../controllers/ipRules.controller");


// Create an IP rule
router.post("/",  (req, res) =>
  IpRulesController.create(req, res)
);

// List all IP rules
router.get("/", (req, res) =>
  IpRulesController.list(req, res)
);

// Update rule by ID
router.patch("/:id",  (req, res) =>
  IpRulesController.update(req, res)
);

// Delete rule by ID
router.delete("/:id",  (req, res) =>
  IpRulesController.remove(req, res)
);

module.exports = router;
