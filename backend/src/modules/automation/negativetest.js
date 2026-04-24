/**
 * AUTOMATION MODULE – NEGATIVE TESTS (FINAL)
 * =========================================
 * These tests validate ONLY enforced failure cases.
 * No assumptions. No worker dependency.
 */

const BASE_URL = "http://localhost:4000";
const ADMIN_EMAIL = "superadmin@example.com";
const ADMIN_PASSWORD = "SuperAdmin123!";

let token;

// --------------------------------------------------
async function request(method, path, body = null, expectFail = false) {
  const res = await fetch(BASE_URL + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let json = {};
  try { json = await res.json(); } catch {}

  if (expectFail && res.ok) {
    console.error(`❌ ${method} ${path} SHOULD have failed`);
    console.error(JSON.stringify(json, null, 2));
    process.exit(1);
  }

  if (!expectFail && !res.ok) {
    console.error(`❌ ${method} ${path} → ${res.status}`);
    console.error(JSON.stringify(json, null, 2));
    process.exit(1);
  }

  return json;
}

// ==================================================
// MAIN
// ==================================================
(async function main() {

  // ==================================================
  // AUTH NEGATIVE
  // ==================================================
  console.log("\n=== AUTH NEGATIVE ===");

  await request(
    "POST",
    "/api/auth/login",
    { email: ADMIN_EMAIL, password: "WrongPassword" },
    true
  );

  const auth = await request("POST", "/api/auth/login", {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  token = auth.accessToken;
  console.log("✓ Auth negative tested");

  // ==================================================
  // PROFILE NEGATIVES
  // ==================================================
  console.log("\n=== PROFILE NEGATIVE ===");

  // missing required fields
  await request(
    "POST",
    "/api/automation/profiles",
    { cron: "0 2 * * *" },
    true
  );

  // invalid cron
  await request(
    "POST",
    "/api/automation/profiles",
    { name: "BadCron", cron: "not-a-cron" },
    true
  );

  // invalid profileId param
  await request(
    "GET",
    "/api/automation/profiles/invalid",
    null,
    true
  );

  // run non-existent profile
  await request(
    "POST",
    "/api/automation/profiles/999999/run",
    null,
    true
  );

  console.log("✓ Profile negatives tested");

  // ==================================================
  // TASK NEGATIVES
  // ==================================================
  console.log("\n=== TASK NEGATIVE ===");

  // create task on non-existent profile
  await request(
    "POST",
    "/api/automation/profiles/999999/tasks",
    {
      actionType: "http_request",
      actionMeta: { url: "https://example.com", method: "GET" },
    },
    true
  );

  // missing actionType
  await request(
    "POST",
    "/api/automation/profiles/1/tasks",
    {},
    true
  );

  // run non-existent task
  await request(
    "POST",
    "/api/automation/tasks/999999/run",
    null,
    true
  );

  console.log("✓ Task negatives tested");

  // ==================================================
  // ACTION REGISTRY NEGATIVES
  // ==================================================
  console.log("\n=== ACTION REGISTRY NEGATIVE ===");

  // action does not exist
  await request(
    "GET",
    "/api/automation/actions/echo",
    null,
    true
  );

  await request(
    "GET",
    "/api/automation/actions/non_existent_action",
    null,
    true
  );

  console.log("✓ Action registry negatives tested");

  // ==================================================
  // WORKFLOW NEGATIVES (GUARANTEED FAILURES)
  // ==================================================
  // ==================================================
// WORKFLOW NEGATIVE (VALIDATION-BASED FAILURE)
// ==================================================
console.log("\n=== WORKFLOW NEGATIVE ===");

const res = await request(
  "POST",
  "/api/automation/workflows/validate",
  {
    definition: {
      name: "InvalidWorkflow",
      tasks: [
        {
          id: "task1",
          type: "condition",
          onTrue: "missing_task",
          onFalse: "task1"
        }
      ]
    }
  }
);

// 👇 CORRECT ASSERTION
if (res.data.valid !== false) {
  console.error("❌ Workflow validation SHOULD have failed");
  console.error(JSON.stringify(res, null, 2));
  process.exit(1);
}

console.log("✓ Workflow validation correctly returned errors");

  // ==================================================
  // AUDIT NEGATIVES
  // ==================================================
  console.log("\n=== AUDIT NEGATIVE ===");

  await request(
    "GET",
    "/api/automation/audit/profiles/invalid/logs",
    null,
    true
  );

  console.log("✓ Audit negatives tested");

 

  console.log("\n✅ ALL NEGATIVE TESTS PASSED\n");

})();
