const express = require("express");
const routes = require("./routes");

module.exports = function initMarketplaceModule(app, prisma, logger) {
    const router = express.Router();

    routes(router, { prisma, logger });

    app.use("/api/marketplace", router);

    logger.info("Marketplace module initialized.");

    return true;
};
