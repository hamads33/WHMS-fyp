/**
 * Axios Ping Plugin - index.js
 */

module.exports = {
  actions: {
    ping: {
      file: "ping.js",
      fnName: "run",
      description: "Perform HTTP GET request using axios"
    }
  }
};
