/**
 * Services Module - Simple Automated Testing Script
 * No Jest, No Supertest - Just Plain Node.js
 * 
 * Usage: node services.test.js
 */

const http = require("http");

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_ADMIN = "http://localhost:4000/api/admin";
const BASE_CLIENT = "http://localhost:4000/api/client";

let testsPassed = 0;
let testsFailed = 0;
let currentTest = "";

// Store IDs for use across tests
let serviceId = null;
let planId = null;
let pricingId = null;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Make HTTP request
 */
function makeRequest(method, url, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }

        resolve({
          status: res.statusCode,
          body: parsed,
          headers: res.headers,
        });
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Assert helper
 */
function assert(condition, message) {
  if (!condition) {
    console.error(`    ❌ FAIL: ${message}`);
    testsFailed++;
    throw new Error(message);
  }
  console.log(`    ✅ ${message}`);
  testsPassed++;
}

/**
 * Test wrapper
 */
async function test(name, fn) {
  currentTest = name;
  try {
    console.log(`\n📝 ${name}`);
    await fn();
  } catch (err) {
    console.error(`    Error: ${err.message}`);
    testsFailed++;
  }
}

/**
 * Print summary
 */
function printSummary() {
  const total = testsPassed + testsFailed;
  const percentage = total > 0 ? Math.round((testsPassed / total) * 100) : 0;

  console.log("\n");
  console.log("═".repeat(60));
  console.log("                    TEST SUMMARY");
  console.log("═".repeat(60));
  console.log(`Total Tests:  ${total}`);
  console.log(`Passed:       ${testsPassed} ✅`);
  console.log(`Failed:       ${testsFailed} ❌`);
  console.log(`Success Rate: ${percentage}%`);
  console.log("═".repeat(60));

  if (testsFailed === 0) {
    console.log("\n🎉 ALL TESTS PASSED! 🎉\n");
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed\n`);
    process.exit(1);
  }
}

// ============================================================================
// POSITIVE TESTS
// ============================================================================

async function positiveTests() {
  console.log("\n\n" + "═".repeat(60));
  console.log("              ✅ POSITIVE TESTS");
  console.log("═".repeat(60));

  // Test 1: Create Service - FIX: Use valid alphanumeric code (no underscores in code field for alphanum validation)
  await test("Create Service with valid data", async () => {
    const res = await makeRequest("POST", `${BASE_ADMIN}/services`, {
      code: "sharedhosting",  // FIX: Changed from "shared_hosting_test" to "sharedhosting"
      name: "Shared Hosting",
      description: "This is a test shared hosting service for validation purposes",
    });

    assert(res.status === 201, `Status code should be 201, got ${res.status}`);
    assert(res.body.id, "Should return service ID");
    assert(res.body.code === "sharedhosting", "Code should match");
    assert(res.body.name === "Shared Hosting", "Name should match");
    assert(res.body.active === true, "Should be active by default");

    serviceId = res.body.id;
  });

  // Test 2: Get Service
  await test("Get Service by ID", async () => {
    const res = await makeRequest("GET", `${BASE_ADMIN}/services/${serviceId}`);

    assert(res.status === 200, `Status code should be 200, got ${res.status}`);
    assert(res.body.id === serviceId, "Should return correct service");
    assert(res.body.code === "sharedhosting", "Code should match");
  });

  // Test 3: List Services
  await test("List all Services", async () => {
    const res = await makeRequest("GET", `${BASE_ADMIN}/services`);

    assert(res.status === 200, `Status code should be 200, got ${res.status}`);
    assert(Array.isArray(res.body), "Should return array");
    assert(res.body.length > 0, "Should have at least one service");
  });

  // Test 4: Update Service
  await test("Update Service", async () => {
    const res = await makeRequest("PUT", `${BASE_ADMIN}/services/${serviceId}`, {
      name: "Updated Shared Hosting",
      description: "Updated description for the hosting service product",
    });

    assert(res.status === 200, `Status code should be 200, got ${res.status}`);
    assert(res.body.name === "Updated Shared Hosting", "Name should be updated");
  });

  // Test 5: Create Plan
  await test("Create Plan for Service", async () => {
    const res = await makeRequest(
      "POST",
      `${BASE_ADMIN}/services/${serviceId}/plans`,
      {
        name: "Basic Plan",
        description: "Perfect for getting started",
        position: 0,
      }
    );

    assert(res.status === 201, `Status code should be 201, got ${res.status}`);
    assert(res.body.id, "Should return plan ID");
    assert(res.body.name === "Basic Plan", "Name should match");
    assert(res.body.active === true, "Should be active by default");

    planId = res.body.id;
  });

  // Test 6: Get Plan
  await test("Get Plan by ID", async () => {
    const res = await makeRequest("GET", `${BASE_ADMIN}/plans/${planId}`);

    assert(res.status === 200, `Status code should be 200, got ${res.status}`);
    assert(res.body.id === planId, "Should return correct plan");
    assert(res.body.name === "Basic Plan", "Name should match");
  });

  // Test 7: List Plans for Service
  await test("List Plans for Service", async () => {
    const res = await makeRequest(
      "GET",
      `${BASE_ADMIN}/services/${serviceId}/plans`
    );

    assert(res.status === 200, `Status code should be 200, got ${res.status}`);
    assert(Array.isArray(res.body), "Should return array");
    assert(res.body.length > 0, "Should have at least one plan");
  });

  // Test 8: Update Plan
  await test("Update Plan", async () => {
    const res = await makeRequest("PUT", `${BASE_ADMIN}/plans/${planId}`, {
      name: "Updated Basic Plan",
      description: "Updated plan description here",
    });

    assert(res.status === 200, `Status code should be 200, got ${res.status}`);
    assert(res.body.name === "Updated Basic Plan", "Name should be updated");
  });

  // Test 9: Create Pricing
  await test("Create Pricing for Plan", async () => {
    const res = await makeRequest(
      "POST",
      `${BASE_ADMIN}/plans/${planId}/pricing`,
      {
        cycle: "monthly",
        price: 9.99,
        currency: "USD",
      }
    );

    assert(res.status === 201, `Status code should be 201, got ${res.status}`);
    assert(res.body.id, "Should return pricing ID");
    assert(res.body.cycle === "monthly", "Cycle should match");
    assert(res.body.price === "9.99" || res.body.price === 9.99, "Price should match");
    assert(res.body.active === true, "Should be active by default");

    pricingId = res.body.id;
  });

  // Test 10: Get Pricing
  await test("Get Pricing by ID", async () => {
    const res = await makeRequest("GET", `${BASE_ADMIN}/pricing/${pricingId}`);

    assert(res.status === 200, `Status code should be 200, got ${res.status}`);
    assert(res.body.id === pricingId, "Should return correct pricing");
    assert(res.body.cycle === "monthly", "Cycle should match");
  });

  // Test 11: List Pricing for Plan
  await test("List Pricing for Plan", async () => {
    const res = await makeRequest("GET", `${BASE_ADMIN}/plans/${planId}/pricing`);

    assert(res.status === 200, `Status code should be 200, got ${res.status}`);
    assert(Array.isArray(res.body), "Should return array");
    assert(res.body.length > 0, "Should have at least one pricing");
  });

  // Test 12: Update Pricing
  await test("Update Pricing", async () => {
    const res = await makeRequest("PUT", `${BASE_ADMIN}/pricing/${pricingId}`, {
      price: 12.99,
    });

    assert(res.status === 200, `Status code should be 200, got ${res.status}`);
    assert(res.body.price === "12.99" || res.body.price === 12.99, "Price should be updated");
  });

  // Test 13: Activate Plan
  await test("Activate Plan", async () => {
    // First deactivate
    await makeRequest("POST", `${BASE_ADMIN}/plans/${planId}/deactivate`);

    // Then activate
    const res = await makeRequest("POST", `${BASE_ADMIN}/plans/${planId}/activate`);

    assert(res.status === 200, `Status code should be 200, got ${res.status}`);
    assert(res.body.plan.active === true, "Plan should be active");
  });

  // Test 14: Toggle Plan Status
  await test("Toggle Plan Status", async () => {
    const res = await makeRequest(
      "POST",
      `${BASE_ADMIN}/plans/${planId}/toggle-status`
    );

    assert(res.status === 200, `Status code should be 200, got ${res.status}`);
    assert(res.body.plan, "Should return plan data");
  });

  // Test 15: Client - List Active Services
  await test("Client - List Active Services", async () => {
    const res = await makeRequest("GET", `${BASE_CLIENT}/services`);

    assert(res.status === 200, `Status code should be 200, got ${res.status}`);
    assert(Array.isArray(res.body), "Should return array");
  });

  // Test 16: Client - Get Active Service
  await test("Client - Get Active Service by ID", async () => {
    const res = await makeRequest("GET", `${BASE_CLIENT}/services/${serviceId}`);

    assert(res.status === 200, `Status code should be 200, got ${res.status}`);
    assert(res.body.id === serviceId, "Should return correct service");
  });

  // Test 17: Client - List Plans
  await test("Client - List Plans for Service", async () => {
    const res = await makeRequest(
      "GET",
      `${BASE_CLIENT}/services/${serviceId}/plans`
    );

    assert(res.status === 200, `Status code should be 200, got ${res.status}`);
    assert(Array.isArray(res.body), "Should return array");
  });

  // Test 18: Client - List Pricing
  await test("Client - List Pricing for Plan", async () => {
    const res = await makeRequest(
      "GET",
      `${BASE_CLIENT}/plans/${planId}/pricing`
    );

    assert(res.status === 200, `Status code should be 200, got ${res.status}`);
    assert(Array.isArray(res.body), "Should return array");
  });

  // Test 19: Deactivate Service
  await test("Deactivate Service", async () => {
    const res = await makeRequest("DELETE", `${BASE_ADMIN}/services/${serviceId}`);

    assert(res.status === 204, `Status code should be 204, got ${res.status}`);
  });

  // Test 20: Verify Service Hidden from Client
  await test("Verify Deactivated Service Hidden from Client", async () => {
    const res = await makeRequest("GET", `${BASE_CLIENT}/services`);

    assert(res.status === 200, `Status code should be 200, got ${res.status}`);
    const found = res.body.find((s) => s.id === serviceId);
    assert(!found, "Deactivated service should not appear in client list");
  });
}

// ============================================================================
// NEGATIVE TESTS
// ============================================================================

async function negativeTests() {
  console.log("\n\n" + "═".repeat(60));
  console.log("              ❌ NEGATIVE TESTS");
  console.log("═".repeat(60));

  // Test 1: Missing Required Fields
  await test("Create Service - Missing required fields", async () => {
    const res = await makeRequest("POST", `${BASE_ADMIN}/services`, {
      name: "Incomplete Service",
    });

    assert(res.status === 400, `Status code should be 400, got ${res.status}`);
    assert(res.body.error, "Should return error message");
  });

  // Test 2: Invalid Service Code Format
  await test("Create Service - Invalid code format", async () => {
    const res = await makeRequest("POST", `${BASE_ADMIN}/services`, {
      code: "in!@#$%",
      name: "Invalid Service",
      description: "This should fail due to invalid code format",
    });

    assert(res.status === 400, `Status code should be 400, got ${res.status}`);
    assert(res.body.error, "Should return error message");
  });

  // Test 3: Service Code Too Short
  await test("Create Service - Code too short", async () => {
    const res = await makeRequest("POST", `${BASE_ADMIN}/services`, {
      code: "ab",
      name: "Invalid Service",
      description: "This should fail due to code being too short",
    });

    assert(res.status === 400, `Status code should be 400, got ${res.status}`);
  });

  // Test 4: Description Too Short
  await test("Create Service - Description too short", async () => {
    const res = await makeRequest("POST", `${BASE_ADMIN}/services`, {
      code: "testservice",
      name: "Test",
      description: "Short",
    });

    assert(res.status === 400, `Status code should be 400, got ${res.status}`);
  });

  // Test 5: Get Non-Existent Service
  await test("Get Non-Existent Service", async () => {
    const res = await makeRequest("GET", `${BASE_ADMIN}/services/99999999`);

    assert(res.status === 404, `Status code should be 404, got ${res.status}`);
    assert(res.body.error, "Should return error message");
  });

  // Test 6: Create Plan for Non-Existent Service
  await test("Create Plan for Non-Existent Service", async () => {
    const res = await makeRequest("POST", `${BASE_ADMIN}/services/99999999/plans`, {
      name: "Ghost Plan",
      description: "Plan for non-existent service",
    });

    assert(res.status === 404, `Status code should be 404, got ${res.status}`);
    assert(res.body.error, "Should return error message");
  });

  // Test 7: Duplicate Plan Name
  await test("Create Plan - Duplicate name in same service", async () => {
    const createRes = await makeRequest(
      "POST",
      `${BASE_ADMIN}/services`,
      {
        code: "uniqueservice",
        name: "Unique Service",
        description: "Service for duplicate plan name test validation",
      }
    );
    const svcId = createRes.body.id;

    await makeRequest("POST", `${BASE_ADMIN}/services/${svcId}/plans`, {
      name: "Premium",
      description: "Premium plan",
    });

    const res = await makeRequest("POST", `${BASE_ADMIN}/services/${svcId}/plans`, {
      name: "Premium",
      description: "Duplicate premium plan",
    });

    assert(res.status === 409, `Status code should be 409, got ${res.status}`);
    assert(res.body.error, "Should return error message");
  });

  // Test 8: Create Pricing for Non-Existent Plan
  await test("Create Pricing for Non-Existent Plan", async () => {
    const res = await makeRequest("POST", `${BASE_ADMIN}/plans/99999999/pricing`, {
      cycle: "monthly",
      price: 9.99,
    });

    assert(res.status === 404, `Status code should be 404, got ${res.status}`);
    assert(res.body.error, "Should return error message");
  });

  // Test 9: Invalid Billing Cycle
  await test("Create Pricing - Invalid billing cycle", async () => {
    const svcRes = await makeRequest("POST", `${BASE_ADMIN}/services`, {
      code: "cycletest",
      name: "Cycle Test",
      description: "Service for testing billing cycle validation",
    });
    const svcId = svcRes.body.id;

    const planRes = await makeRequest(
      "POST",
      `${BASE_ADMIN}/services/${svcId}/plans`,
      {
        name: "Test Plan",
        description: "Test plan",
      }
    );
    const planId = planRes.body.id;

    const res = await makeRequest("POST", `${BASE_ADMIN}/plans/${planId}/pricing`, {
      cycle: "weekly",
      price: 5.99,
    });

    assert(res.status === 400, `Status code should be 400, got ${res.status}`);
    assert(res.body.error, "Should return error message");
  });

  // Test 10: Negative Price
  await test("Create Pricing - Negative price", async () => {
    const svcRes = await makeRequest("POST", `${BASE_ADMIN}/services`, {
      code: "pricetest",
      name: "Price Test",
      description: "Service for testing price validation",
    });
    const svcId = svcRes.body.id;

    const planRes = await makeRequest(
      "POST",
      `${BASE_ADMIN}/services/${svcId}/plans`,
      {
        name: "Test Plan",
        description: "Test plan",
      }
    );
    const planId = planRes.body.id;

    const res = await makeRequest("POST", `${BASE_ADMIN}/plans/${planId}/pricing`, {
      cycle: "monthly",
      price: -9.99,
    });

    assert(res.status === 400, `Status code should be 400, got ${res.status}`);
    assert(res.body.error, "Should return error message");
  });

  // Test 11: Duplicate Pricing Cycle
  await test("Create Pricing - Duplicate billing cycle", async () => {
    const svcRes = await makeRequest("POST", `${BASE_ADMIN}/services`, {
      code: "duppricing",
      name: "Duplicate Pricing Test",
      description: "Service for testing duplicate pricing",
    });
    const svcId = svcRes.body.id;

    const planRes = await makeRequest(
      "POST",
      `${BASE_ADMIN}/services/${svcId}/plans`,
      {
        name: "Test Plan",
        description: "Test plan",
      }
    );
    const planId = planRes.body.id;

    await makeRequest("POST", `${BASE_ADMIN}/plans/${planId}/pricing`, {
      cycle: "monthly",
      price: 9.99,
    });

    const res = await makeRequest("POST", `${BASE_ADMIN}/plans/${planId}/pricing`, {
      cycle: "monthly",
      price: 19.99,
    });

    assert(res.status === 409, `Status code should be 409, got ${res.status}`);
    assert(res.body.error, "Should return error message");
  });

  // Test 12: Get Non-Existent Plan
  await test("Get Non-Existent Plan", async () => {
    const res = await makeRequest("GET", `${BASE_ADMIN}/plans/99999999`);

    assert(res.status === 404, `Status code should be 404, got ${res.status}`);
    assert(res.body.error, "Should return error message");
  });

  // Test 13: Get Non-Existent Pricing
  await test("Get Non-Existent Pricing", async () => {
    const res = await makeRequest("GET", `${BASE_ADMIN}/pricing/99999999`);

    assert(res.status === 404, `Status code should be 404, got ${res.status}`);
    assert(res.body.error, "Should return error message");
  });

  // Test 14: Update Plan with Empty Name
  await test("Update Plan - Empty name", async () => {
    const svcRes = await makeRequest("POST", `${BASE_ADMIN}/services`, {
      code: "updatetest",
      name: "Update Test",
      description: "Service for testing plan updates",
    });
    const svcId = svcRes.body.id;

    const planRes = await makeRequest(
      "POST",
      `${BASE_ADMIN}/services/${svcId}/plans`,
      {
        name: "Original Name",
        description: "Original description",
      }
    );
    const planId = planRes.body.id;

    const res = await makeRequest("PUT", `${BASE_ADMIN}/plans/${planId}`, {
      name: "",
    });

    assert(res.status === 400, `Status code should be 400, got ${res.status}`);
  });

  // Test 15: Plan Not Found on Status Update
  await test("Update Plan Status - Non-Existent Plan", async () => {
    const res = await makeRequest(
      "POST",
      `${BASE_ADMIN}/plans/99999999/toggle-status`
    );

    assert(res.status === 404, `Status code should be 404, got ${res.status}`);
    assert(res.body.error, "Should return error message");
  });

  // Test 16: Client - Get Non-Existent Service
  await test("Client - Get Non-Existent Service", async () => {
    const res = await makeRequest("GET", `${BASE_CLIENT}/services/99999999`);

    assert(res.status === 404, `Status code should be 404, got ${res.status}`);
    assert(res.body.error, "Should return error message");
  });

  // Test 17: Client - Get Inactive Service
  await test("Client - Cannot access inactive service", async () => {
    const svcRes = await makeRequest("POST", `${BASE_ADMIN}/services`, {
      code: "inactivetest",
      name: "Inactive Test",
      description: "Service to test client cannot see inactive",
    });
    const svcId = svcRes.body.id;

    await makeRequest("DELETE", `${BASE_ADMIN}/services/${svcId}`);

    const res = await makeRequest("GET", `${BASE_CLIENT}/services/${svcId}`);

    assert(res.status === 404, `Status code should be 404, got ${res.status}`);
  });

  // Test 18: Activate Already Active Plan
  await test("Activate Already Active Plan - Should fail", async () => {
    const svcRes = await makeRequest("POST", `${BASE_ADMIN}/services`, {
      code: "alreadyactive",
      name: "Already Active Test",
      description: "Test activating already active plan",
    });
    const svcId = svcRes.body.id;

    const planRes = await makeRequest(
      "POST",
      `${BASE_ADMIN}/services/${svcId}/plans`,
      {
        name: "Active Plan",
        description: "Already active",
      }
    );
    const planId = planRes.body.id;

    const res = await makeRequest("POST", `${BASE_ADMIN}/plans/${planId}/activate`);

    assert(res.status === 400, `Status code should be 400, got ${res.status}`);
    assert(res.body.error, "Should return error message");
  });

  // Test 19: Plan Name Too Short
  await test("Create Plan - Name too short", async () => {
    const svcRes = await makeRequest("POST", `${BASE_ADMIN}/services`, {
      code: "shortnametest",
      name: "Short Name Test",
      description: "Service for testing plan name length validation",
    });
    const svcId = svcRes.body.id;

    const res = await makeRequest(
      "POST",
      `${BASE_ADMIN}/services/${svcId}/plans`,
      {
        name: "X",
        description: "Plan with too short name",
      }
    );

    assert(res.status === 400, `Status code should be 400, got ${res.status}`);
  });

  // Test 20: Invalid Update Data
  await test("Update Service - Invalid data type", async () => {
    const svcRes = await makeRequest("POST", `${BASE_ADMIN}/services`, {
      code: "invalidupdate",
      name: "Invalid Update Test",
      description: "Service for testing invalid update data",
    });
    const svcId = svcRes.body.id;

    const res = await makeRequest("PUT", `${BASE_ADMIN}/services/${svcId}`, {
      active: "yes",
    });

    assert(res.status === 400, `Status code should be 400, got ${res.status}`);
  });
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runAllTests() {
  console.log("\n");
  console.log("╔" + "═".repeat(58) + "╗");
  console.log("║" + " ".repeat(58) + "║");
  console.log("║" + "  🧪 SERVICES MODULE - AUTOMATED TESTING".padEnd(57) + "║");
  console.log("║" + " ".repeat(58) + "║");
  console.log("╚" + "═".repeat(58) + "╝");

  console.log(`\n⏱️  Starting tests at ${new Date().toLocaleTimeString()}`);
  console.log(`🌍 Base URL: ${BASE_ADMIN}`);

  try {
    await positiveTests();
    await negativeTests();
    printSummary();
  } catch (err) {
    console.error("\n💥 Fatal error during testing:");
    console.error(err.message);
    process.exit(1);
  }
}

// Run all tests
runAllTests();