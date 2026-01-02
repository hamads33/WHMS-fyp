// test-porkbun.js
const porkbun = require("../registrars/porkbun");

(async () => {
  const res = await porkbun.checkAvailability("example-test-123456.com");
  console.log(res);
})();
