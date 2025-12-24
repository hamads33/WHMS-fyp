// src/modules/automation/actions/builtin/index.js
const echo = require("./echo.action");

const http = require("./http-request.action");

module.exports = [
  echo,

  http,
];
