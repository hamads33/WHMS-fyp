const registrar = require("../registrars/mock");

(async () => {
  console.log("Availability:", await registrar.checkAvailability("example.com"));

  console.log("Register:", await registrar.registerDomain({
    domain: "example.com",
    years: 1
  }));

  console.log("Transfer:", await registrar.transferDomain({
    domain: "example.com",
    authCode: "TEST-EPP"
  }));

  console.log("Sync:", await registrar.syncDomain("example.com"));
})();
