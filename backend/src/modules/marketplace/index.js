// src/modules/marketplace/index.js

const routes = require("./http/routes");

module.exports = function MarketplaceModule(opts = {}) {
  return {
    routes: routes(opts)
  };
};
