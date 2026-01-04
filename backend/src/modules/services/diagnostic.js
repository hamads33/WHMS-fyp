/**
 * Diagnostic Test - Identify What's Wrong
 * Run this to see what endpoints work and what don't
 */

const http = require("http");

const BASE_ADMIN = "http://localhost:4000/api/admin";
const BASE_CLIENT = "http://localhost:4000/api/client";

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
        });
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function diagnose() {
  console.log("\n🔍 DIAGNOSTIC TEST - Finding Issues\n");

  // Test 1: Can we reach the server?
  console.log("1️⃣  Testing Server Connection...");
  try {
    const res = await makeRequest("GET", `${BASE_ADMIN}/services`);
    console.log(`   ✅ Server is reachable`);
    console.log(`   Status: ${res.status}`);
    console.log(`   Response type: ${typeof res.body}`);
    if (res.status >= 500) {
      console.log(`   ⚠️  Status ${res.status} - Server error`);
      console.log(`   Error: ${res.body?.error || res.body?.message || "Unknown"}`);
    }
  } catch (err) {
    console.log(`   ❌ Cannot reach server`);
    console.log(`   Error: ${err.message}`);
    console.log(`   Solution: Make sure npm start is running`);
    process.exit(1);
  }

  // Test 2: Try to create a service
  console.log("\n2️⃣  Testing Create Service...");
  try {
    const res = await makeRequest("POST", `${BASE_ADMIN}/services`, {
      code: "diagnostictest",
      name: "Diagnostic Test",
      description: "This is a test to diagnose issues with the API",
    });

    console.log(`   Status: ${res.status}`);

    if (res.status === 201) {
      console.log(`   ✅ Create works! Got service ID: ${res.body.id}`);
      return res.body.id;
    } else if (res.status === 400) {
      console.log(`   ❌ Validation error (400)`);
      console.log(`   Details: ${JSON.stringify(res.body, null, 2)}`);
      console.log(`   Solution: Check validation middleware is wired`);
    } else if (res.status === 404) {
      console.log(`   ❌ Endpoint not found (404)`);
      console.log(`   Solution: Routes not registered in app.js`);
      console.log(`   Check: app.use("/api/admin", adminRoutes)`);
    } else if (res.status >= 500) {
      console.log(`   ❌ Server error (${res.status})`);
      console.log(`   Details: ${JSON.stringify(res.body, null, 2)}`);
      console.log(`   Solution: Check server logs for errors`);
    } else {
      console.log(`   ❌ Unexpected status: ${res.status}`);
      console.log(`   Response: ${JSON.stringify(res.body, null, 2)}`);
    }
    return null;
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return null;
  }
}

async function checkSetup() {
  console.log("\n📋 SETUP CHECKLIST\n");

  console.log("Required Checks:");
  console.log("  [ ] 1. npm start is running");
  console.log("  [ ] 2. No errors in server logs");
  console.log("  [ ] 3. app.js has route registration:");
  console.log("       const { adminRoutes, clientRoutes } = require('./modules/services');");
  console.log("       app.use('/api/admin', adminRoutes);");
  console.log("       app.use('/api/client', clientRoutes);");
  console.log("  [ ] 4. All service files exist in src/modules/services/");
  console.log("  [ ] 5. Joi is installed: npm install joi");
  console.log("  [ ] 6. Prisma client is working");
  console.log("  [ ] 7. Database migrations are up to date");

  console.log("\nCommon Issues:");
  console.log("  ❌ 404 errors → Routes not registered in app.js");
  console.log("  ❌ 500 errors → Check server logs");
  console.log("  ❌ 400 errors → Validation issue, check request data");
  console.log("  ❌ Connection error → Server not running");
}

async function run() {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║         🔍 SERVICES MODULE - DIAGNOSTIC TEST           ║");
  console.log("╚════════════════════════════════════════════════════════╝");

  const serviceId = await diagnose();

  if (!serviceId) {
    console.log("\n❌ Create Service failed!");
    checkSetup();
    console.log("\n📖 Next Steps:");
    console.log("  1. Fix the issue identified above");
    console.log("  2. Restart your server");
    console.log("  3. Run this diagnostic again");
    process.exit(1);
  }

  // Test 3: Try to get the service
  console.log("\n3️⃣  Testing Get Service...");
  try {
    const res = await makeRequest("GET", `${BASE_ADMIN}/services/${serviceId}`);
    console.log(`   Status: ${res.status}`);
    if (res.status === 200) {
      console.log(`   ✅ Get works!`);
    } else {
      console.log(`   ❌ Get failed with status ${res.status}`);
      console.log(`   Response: ${JSON.stringify(res.body, null, 2)}`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  // Test 4: Try to create a plan
  console.log("\n4️⃣  Testing Create Plan...");
  try {
    const res = await makeRequest(
      "POST",
      `${BASE_ADMIN}/services/${serviceId}/plans`,
      {
        name: "Test Plan",
        description: "A test plan",
      }
    );

    console.log(`   Status: ${res.status}`);
    if (res.status === 201) {
      console.log(`   ✅ Create Plan works! Got plan ID: ${res.body.id}`);
    } else {
      console.log(`   ❌ Create Plan failed with status ${res.status}`);
      console.log(`   Response: ${JSON.stringify(res.body, null, 2)}`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  // Test 5: Check validation
  console.log("\n5️⃣  Testing Validation...");
  try {
    const res = await makeRequest("POST", `${BASE_ADMIN}/services`, {
      name: "Missing Code", // Missing required field
    });

    console.log(`   Status: ${res.status}`);
    if (res.status === 400) {
      console.log(`   ✅ Validation works! Got error:`, res.body);
    } else if (res.status === 201) {
      console.log(`   ❌ Validation NOT working - invalid data was accepted`);
    } else {
      console.log(`   ⚠️  Unexpected status: ${res.status}`);
    }
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
  }

  console.log("\n✅ Diagnostic complete!");
  console.log("\nIf all checks passed: Run the full test with services.test.js");
  console.log("If checks failed: Fix issues above then restart and try again");
}

run().catch((err) => {
  console.error("\n💥 Fatal error:", err.message);
  process.exit(1);
});