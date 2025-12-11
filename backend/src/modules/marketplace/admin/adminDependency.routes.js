const express = require("express");
const controller = require("./adminDependency.controller");

module.exports = function dependencyRoutes({ prisma, logger = console }) {
  const router = express.Router();

  // List dependencies for a product
  router.get("/products/:productId/dependencies", (req, res) =>
    controller.list(req, res, prisma)
  );

  // Approve dependency
  router.post("/dependencies/:id/approve", (req, res) =>
    controller.approve(req, res, prisma)
  );

  // Reject dependency
  router.post("/dependencies/:id/reject", (req, res) =>
    controller.reject(req, res, prisma)
  );

  return router;
};
