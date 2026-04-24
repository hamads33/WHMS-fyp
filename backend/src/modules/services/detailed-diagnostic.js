/**
 * Detailed Diagnostic - Check What's Actually Happening
 * Run: node detailed-diagnostic.js
 */

const http = require("http");

const BASE = "http://localhost:4000";

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
      res.on("data", (chunk) => (data += chunk));
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
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runDetailedDiagnostic() {
  console.log("\n🔍 DETAILED DIAGNOSTIC - What's Actually Happening?\n");

  console.log("📍 Testing 5 critical endpoints...\n");

  const tests = [
    {
      name: "1. GET /api/admin/services",
      method: "GET",
      url: `${BASE}/api/admin/services`,
      expectedStatus: 200,
      expectedBody: "array",
    },
    {
      name: "2. POST /api/admin/services (with valid data)",
      method: "POST",
      url: `${BASE}/api/admin/services`,
      body: {
        code: "test_service_123",
        name: "Test Service",
        description: "This is a test service to verify the API works",
      },
      expectedStatus: 201,
      expectedBody: "object with id",
    },
    {
      name: "3. POST /api/admin/services (missing required field)",
      method: "POST",
      url: `${BASE}/api/admin/services`,
      body: {
        name: "Missing Code",
        description: "This should fail validation",
      },
      expectedStatus: 400,
      expectedBody: "error object",
    },
    {
      name: "4. GET /api/client/services",
      method: "GET",
      url: `${BASE}/api/client/services`,
      expectedStatus: 200,
      expectedBody: "array",
    },
    {
      name: "5. GET /health (control test)",
      method: "GET",
      url: `${BASE}/health`,
      expectedStatus: 200,
      expectedBody: "status ok",
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n${test.name}`);
      console.log(`   Method: ${test.method}`);
      console.log(`   URL: ${test.url}`);
      if (test.body) console.log(`   Body: ${JSON.stringify(test.body)}`);
      
      const res = await makeRequest(test.method, test.url, test.body);

      console.log(`\n   ✓ Response received`);
      console.log(`   Status: ${res.status}`);
      console.log(`   Expected: ${test.expectedStatus}`);

      if (res.status === test.expectedStatus) {
        console.log(`   ✅ Status matches!`);
        passed++;
      } else {
        console.log(`   ❌ Status MISMATCH!`);
        failed++;
      }

      // Show response body
      if (typeof res.body === "object") {
        console.log(`   Body: ${JSON.stringify(res.body, null, 2)}`);
      } else {
        console.log(`   Body: ${res.body}`);
      }

      // Diagnose common issues
      if (res.status === 404) {
        console.log(`\n   🔴 ERROR: Got 404`);
        console.log(`   • Route might not be registered`);
        console.log(`   • Check: app.use("/api/admin", adminRoutes);`);
      } else if (res.status === 500) {
        console.log(`\n   🔴 ERROR: Got 500`);
        console.log(`   • Server error occurred`);
        console.log(`   • Check server logs for stack trace`);
        if (res.body?.error) {
          console.log(`   • Error: ${res.body.error}`);
        }
      } else if (res.status === 400 && test.expectedStatus !== 400) {
        console.log(`\n   🟡 WARNING: Got 400 (validation error)`);
        console.log(`   • Validation might be too strict`);
        if (res.body?.details) {
          console.log(`   • Details: ${JSON.stringify(res.body.details)}`);
        }
      }

      console.log("   " + "─".repeat(60));
    } catch (err) {
      console.log(`   ❌ ERROR: ${err.message}`);
      console.log(`\n   🔴 CANNOT CONNECT TO SERVER`);
      console.log(`   • Is the server running?`);
      console.log(`   • Run: npm start`);
      console.log(`   • Make sure PORT=4000 is set`);
      failed++;
    }
  }

  // Summary
  console.log("\n\n═══════════════════════════════════════════════════════");
  console.log("                    SUMMARY");
  console.log("═══════════════════════════════════════════════════════\n");

  console.log(`✅ Passed: ${passed}/5`);
  console.log(`❌ Failed: ${failed}/5`);

  if (failed === 0) {
    console.log("\n🎉 ALL TESTS PASSED! Services module is working correctly.");
    console.log("\n📝 Next: Run full test suite");
    console.log("   Command: node src/modules/services/test.js");
  } else if (failed === 5) {
    console.log("\n🔴 CANNOT CONNECT TO SERVER");
    console.log("\n💡 Solutions:");
    console.log("   1. Make sure server is running: npm start");
    console.log("   2. Check server is listening on port 4000");
    console.log("   3. Check for startup errors");
  } else {
    console.log("\n⚠️  SOME TESTS FAILED");
    console.log("\n💡 Check:");
    if (failed === 1 && passed === 4) {
      console.log("   • Only 1 test failed - might be a specific issue");
      console.log("   • Check the test output above for details");
    } else {
      console.log("   • Multiple tests failed");
      console.log("   • Check server logs");
      console.log("   • Review the errors above");
    }
  }

  console.log("\n═══════════════════════════════════════════════════════\n");
}

runDetailedDiagnostic().catch(console.error);