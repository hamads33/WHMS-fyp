// test-porkbun.js
const porkbun = require("../registrars/porkbun");

(async () => {
  try {
    console.log("\n🧪 Testing Porkbun Registrar\n");

    // ─────────────────────────────
    // Test 1: Availability Check
    // ─────────────────────────────
    console.log("1️⃣ Domain Availability Check");
    try {
      const res = await porkbun.checkAvailability("example-test-123456.com");
      console.log("   ✔ Domain:", res.domain);
      console.log("   ✔ Available:", res.available);
      console.log("   ✔ Price:", res.price);
    } catch (err) {
      console.error("   ✗ Error:", err.message);
    }

    // ─────────────────────────────
    // Test 2: List Domains
    // ─────────────────────────────
    console.log("\n2️⃣ List All Domains in Account");
    try {
      const res = await porkbun.listDomains();
      console.log("   ✔ Success:", res.success);
      console.log("   ✔ Total domains:", res.domains?.length || 0);
      if (res.domains && res.domains.length > 0) {
        console.log("   ✔ Sample domain:", res.domains[0].domain);
      }
    } catch (err) {
      console.error("   ✗ Error:", err.message);
    }

    // ─────────────────────────────
    // Test 3: Registration (Expected to Fail)
    // ─────────────────────────────
    console.log("\n3️⃣ Domain Registration (Expected to Fail)");
    try {
      const res = await porkbun.registerDomain({
        domain: "test.com",
        years: 1
      });
      console.log("   ✗ Unexpected success:", res);
    } catch (err) {
      console.log("   ✔ Expected error:", err.message);
    }

    // ─────────────────────────────
    // Test 4: Renewal (Expected to Fail)
    // ─────────────────────────────
    console.log("\n4️⃣ Domain Renewal (Expected to Fail)");
    try {
      const res = await porkbun.renewDomain({
        domain: "test.com",
        years: 1
      });
      console.log("   ✗ Unexpected success:", res);
    } catch (err) {
      console.log("   ✔ Expected error:", err.message);
    }

    // ─────────────────────────────
    // Test 5: Transfer (Expected to Fail)
    // ─────────────────────────────
    console.log("\n5️⃣ Domain Transfer (Expected to Fail)");
    try {
      const res = await porkbun.transferDomain({
        domain: "test.com",
        authCode: "TEST-CODE"
      });
      console.log("   ✗ Unexpected success:", res);
    } catch (err) {
      console.log("   ✔ Expected error:", err.message);
    }

    console.log("\n✅ PORKBUN REGISTRAR TESTS COMPLETED\n");
    console.log("📝 Note: Porkbun API only supports:");
    console.log("   - Availability checks");
    console.log("   - Nameserver updates");
    console.log("   - Domain sync/polling");
    console.log("   - Domain listing");
    console.log("");
    console.log("Manual operations required:");
    console.log("   - Registration: Use Porkbun web interface");
    console.log("   - Renewal: Use Porkbun web interface");
    console.log("   - Transfer: Use Porkbun web interface");
    console.log("");

    process.exit(0);

  } catch (err) {
    console.error("\n❌ PORKBUN TEST FAILED");
    console.error("Error:", err.message);
    process.exit(1);
  }
})();