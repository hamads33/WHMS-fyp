const router = require("express").Router();
const ctrl = require("../controllers/server-group.controller");
const {
  validateCreateGroup,
  validateUpdateGroup,
} = require("../validation/server.validation");

router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", validateCreateGroup, ctrl.create);
router.patch("/:id", validateUpdateGroup, ctrl.update);
router.delete("/:id", ctrl.remove);

// Assign a server to a group
router.post("/:id/assign", ctrl.assignServer);

// Set the default server for a group
router.post("/:id/default", ctrl.setDefault);

module.exports = router;
