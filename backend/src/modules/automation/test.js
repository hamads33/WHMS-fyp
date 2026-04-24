/**
 * AUTOMATION MODULE – FINAL E2E TEST (DUPLICATE-SAFE)
 * ==================================================
 * - Handles unique constraints
 * - Respects strict validators
 * - Self-healing across multiple runs
 */

const BASE_URL = "http://localhost:4000";
const ADMIN_EMAIL = "superadmin@example.com";
const ADMIN_PASSWORD = "SuperAdmin123!";

// ---------- unique suffix (CRITICAL FIX) ----------
const RUN_ID = Date.now();
const PROFILE_NAME = `E2E-Test-Profile-${RUN_ID}`;

let token;
let profileId;
let taskId;
let workflowId;
let workflowRunId;

const sleep = ms => new Promise(r => setTimeout(r, ms));

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

  if (!expectFail && !res.ok) {
    console.error(`❌ ${method} ${path} → ${res.status}`);
    console.error(JSON.stringify(json, null, 2));
    process.exit(1);
  }

  return { status: res.status, body: json };
}

(async function main() {

  // ==================================================
  // AUTH
  // ==================================================
  console.log("\n=== AUTH ===");

  let res = await request("POST", "/api/auth/login", {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  token = res.body.accessToken;
  if (!token) {
    console.error("❌ accessToken missing");
    process.exit(1);
  }
  console.log("✓ Authenticated");

  // ==================================================
  // PROFILES
  // ==================================================
  console.log("\n=== PROFILES ===");

  // list (also useful for debugging)
  await request("GET", "/api/automation/profiles");

  // create (UNIQUE NAME → NO P2002)
  res = await request("POST", "/api/automation/profiles", {
    name: PROFILE_NAME,
    description: "E2E Test Profile",
    cron: "0 2 * * *",
    enabled: true,
  });

  profileId = res.body.data.id;
  console.log("✓ Profile created:", profileId);

  await request("GET", `/api/automation/profiles/${profileId}`);

  // strict PUT → full payload
  await request("PUT", `/api/automation/profiles/${profileId}`, {
    name: PROFILE_NAME,
    description: "Updated description",
    cron: "0 2 * * *",
    enabled: false,
  });

  await request("POST", `/api/automation/profiles/${profileId}/enable`);
  await request("POST", `/api/automation/profiles/${profileId}/disable`);

  // negatives
  await request("POST", "/api/automation/profiles", { cron: "0 2 * * *" }, true);
  await request("GET", "/api/automation/profiles/99999", null, true);

  console.log("✓ Profiles tested");

  // ==================================================
  // TASKS
  // ==================================================
  console.log("\n=== TASKS ===");

  await request("GET", `/api/automation/profiles/${profileId}/tasks`);

  res = await request(
    "POST",
    `/api/automation/profiles/${profileId}/tasks`,
    {
      actionType: "echo",
      actionMeta: { message: "hello world" },
      order: 0,
    }
  );

  taskId = res.body.data.id;
  console.log("✓ Task created:", taskId);

  await request(
    "GET",
    `/api/automation/profiles/${profileId}/tasks/${taskId}`
  );

  await request(
    "PUT",
    `/api/automation/profiles/${profileId}/tasks/${taskId}`,
    {
      actionType: "echo",
      actionMeta: { message: "updated" },
      order: 1,
    }
  );

  await request("POST", `/api/automation/tasks/${taskId}/run`);

  // negative
  await request(
    "POST",
    `/api/automation/profiles/${profileId}/tasks`,
    {},
    true
  );

  console.log("✓ Tasks tested");

  // ==================================================
  // PROFILE RUN
  // ==================================================
  console.log("\n=== PROFILE RUN ===");

  await request("POST", `/api/automation/profiles/${profileId}/run`);
  await request("POST", `/api/automation/profiles/99999/run`, null, true);

  console.log("✓ Profile run tested");

  // ==================================================
  // ACTION REGISTRY
  // ==================================================
  console.log("\n=== ACTION REGISTRY ===");

  await request("GET", "/api/automation/actions");
  await request("GET", "/api/automation/actions/http_request");


  console.log("✓ Actions tested");

  // ==================================================
  // WORKFLOWS
  // ==================================================
  console.log("\n=== WORKFLOWS ===");

  await request("POST", "/api/automation/workflows/validate", {
    definition: {
      name: "Valid Workflow",
      tasks: [{ id: "t1", type: "action", actionType: "echo" }],
    },
  });

  res = await request("POST", "/api/automation/workflows", {
    name: `Workflow-${RUN_ID}`,
    definition: {
      name: "Order Workflow",
      tasks: [{ id: "step1", type: "action", actionType: "echo" }],
    },
  });

  workflowId = res.body.data.id;
  console.log("✓ Workflow created:", workflowId);

  await request("GET", `/api/automation/workflows/${workflowId}`);

  await request("PUT", `/api/automation/workflows/${workflowId}`, {
    name: `Workflow-${RUN_ID}-updated`,
    definition: {
      name: "Updated Workflow",
      tasks: [{ id: "step2", type: "action", actionType: "echo" }],
    },
  });

  res = await request(
    "POST",
    `/api/automation/workflows/${workflowId}/run`,
    { input: { orderId: "ORD-1" } }
  );

  workflowRunId = res.body.data.runId;
  await sleep(2000);

  await request("GET", `/api/automation/runs/${workflowRunId}`);
  await request("GET", `/api/automation/workflows/${workflowId}/history`);
  await request("GET", `/api/automation/workflows/${workflowId}/metrics`);

  console.log("✓ Workflows tested");

  // ==================================================
  // AUDIT LOGS
  // ==================================================
  console.log("\n=== AUDIT LOGS ===");

  await request("GET", "/api/automation/audit/logs");
  await request("GET", "/api/automation/audit/logs/count");
  await request("GET", `/api/automation/audit/profiles/${profileId}/logs`);
  await request("GET", `/api/automation/audit/profiles/${profileId}/logs/count`);

  console.log("✓ Audit tested");

  // ==================================================
  // SECURITY
  // ==================================================
  console.log("\n=== SECURITY ===");

  const saved = token;

  token = null;
  await request("GET", "/api/automation/profiles", null, true);

  token = "invalid.token";
  await request("GET", "/api/automation/profiles", null, true);

  token = saved;

  await request(
    "POST",
    "/api/automation/profiles",
    { name: "'; DROP TABLE users; --", cron: "0 2 * * *" },
    true
  );

  console.log("✓ Security tested");

  // ==================================================
  // CLEANUP (BEST EFFORT)
  // ==================================================
  console.log("\n=== CLEANUP ===");

  await request("DELETE", `/api/automation/workflows/${workflowId}`);
  await request(
    "DELETE",
    `/api/automation/profiles/${profileId}/tasks/${taskId}`
  );
  await request("DELETE", `/api/automation/profiles/${profileId}`);

  console.log("\n✅ ALL AUTOMATION TESTS PASSED (SAFE TO RE-RUN)\n");

})();
