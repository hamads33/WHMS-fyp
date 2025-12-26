// src/modules/automation/actions/builtin/index.js
const httpRequest = require("./http-request.action");
const echo = require("./echo.action");

const builtins = [httpRequest, echo];


const map = Object.fromEntries(
  builtins.map(a => {
    if (!a.name) {
      throw new Error("Built-in action missing name");
    }
    return [a.name, a];
  })
);

module.exports = {
  all: builtins,
  get(name) {
    return map[name] || null;
  },
};
