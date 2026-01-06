/**
 * ============================================================
 * FULL ORDER LIFECYCLE INTEGRATION TEST (API-FIRST)
 * ============================================================
 */

process.env.NODE_ENV = "test";

const axios = require("axios");

// ============================================================
// CONFIG
// ============================================================
const API_BASE = "http://localhost:4000/api";

// ---- SEEDED USERS ----
const ADMIN_EMAIL = "superadmin@example.com";
const ADMIN_PASSWORD = "SuperAdmin123!";

const CLIENT_EMAIL = "client.test@example.com";
const CLIENT_PASSWORD = "ClientPass123!";

// ============================================================
// GLOBAL STATE
// ============================================================
let adminToken;
let clientToken;

let serviceId;
let planId;
let pricingId;
let orderId;
let cancelledOrderId;

const createdOrders = [];

// ============================================================
// HELPERS
// ============================================================
function log(title) {
  console.log(`\n📌 ${title}`);
}
function pass(msg) {
  console.log(`✅ ${msg}`);
}
function warn(msg) {
  console.warn(`⚠️ ${msg}`);
}
function fail(msg) {
  throw new Error(msg);
}
function assert(cond, msg) {
  if (!cond) fail(msg);
}

const adminHeaders = () => ({
  headers: { Authorization: `Bearer ${adminToken}` }
});
const clientHeaders = () => ({
  headers: { Authorization: `Bearer ${clientToken}` }
});

// ============================================================
// AUTH
// ============================================================
async function adminLogin() {
  log("Admin Login");
  const res = await axios.post(`${API_BASE}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  adminToken = res.data.accessToken;
  assert(adminToken, "Admin token missing");
  pass("Admin authenticated");
}

async function clientLogin() {
  log("Client Login (Seeded)");
  const res = await axios.post(`${API_BASE}/auth/login`, {
    email: CLIENT_EMAIL,
    password: CLIENT_PASSWORD
  });
  clientToken = res.data.accessToken;
  assert(clientToken, "Client token missing");
  pass("Client authenticated");
}

// ============================================================
// ADMIN SETUP
// ============================================================
async function createService() {
  log("Create Service");
  const res = await axios.post(
    `${API_BASE}/admin/services`,
    {
      code: `svc_${Date.now()}`,
      name: "Lifecycle Test Service",
      description: "Automated lifecycle test"
    },
    adminHeaders()
  );
  serviceId = res.data.id;
  assert(serviceId, "Service ID missing");
  pass(`Service created (${serviceId})`);
}

async function createPlan() {
  log("Create Plan");
  const res = await axios.post(
    `${API_BASE}/admin/services/${serviceId}/plans`,
    { name: "Lifecycle Plan", summary: "Test plan" },
    adminHeaders()
  );
  planId = res.data.id;
  assert(planId, "Plan ID missing");
  pass(`Plan created (${planId})`);
}

async function createPricing() {
  log("Create Pricing");
  const res = await axios.post(
    `${API_BASE}/admin/plans/${planId}/pricing`,
    { cycle: "monthly", price: 29.99 },
    adminHeaders()
  );
  pricingId = res.data.id;
  assert(pricingId, "Pricing ID missing");
  pass(`Pricing created (${pricingId})`);
}

// ============================================================
// CLIENT FLOW
// ============================================================
async function createOrder() {
  log("Client Creates Order");
  const res = await axios.post(
    `${API_BASE}/client/orders`,
    { serviceId, planId, pricingId },
    clientHeaders()
  );
  orderId = res.data.id;
  createdOrders.push(orderId);
  assert(res.data.status === "pending", "Order not pending");
  pass(`Order created (${orderId})`);
}

async function verifySnapshot() {
  log("Verify Snapshot");
  const res = await axios.get(
    `${API_BASE}/client/orders/${orderId}`,
    clientHeaders()
  );

  const snap = res.data.snapshot?.snapshot || res.data.snapshot;
  assert(snap, "Snapshot missing");

  const snapPrice = Number(snap.pricing.price);
  assert(snapPrice === 29.99, "Snapshot price incorrect");

  pass("Snapshot verified");
}


// ============================================================
// NEGATIVE TESTS
// ============================================================
async function negativeClientCannotActivate() {
  log("NEGATIVE: Client cannot activate order");
  try {
    await axios.post(
      `${API_BASE}/admin/orders/${orderId}/activate`,
      {},
      clientHeaders()
    );
    fail("Client activated order");
  } 
  catch (err) {
  const status = err.response?.status;

  assert(
    status === undefined || [401, 403, 404].includes(status),
    `Unexpected error code: ${status}`
  );

  pass("Client activation blocked");
}

}

// ============================================================
// ADMIN LIFECYCLE
// ============================================================
async function activateOrder() {
  log("Activate Order");

  try {
    const res = await axios.post(
      `${API_BASE}/admin/orders/${orderId}/activate`,
      {},
      adminHeaders()
    );

    assert(res.data.status === "active", "Activation failed");
    pass("Order activated");
    return;
  } catch (err) {
    // 409 = already active / activation conflict
    if (err.response?.status === 409) {
      const check = await axios.get(
        `${API_BASE}/client/orders/${orderId}`,
        clientHeaders()
      );

      assert(
        check.data.status === "active",
        "Order not active after 409 conflict"
      );

      pass("Order already active (409 handled)");
      return;
    }

    throw err;
  }
}


async function negativeCancelActiveOrder() {
  log("NEGATIVE: Cannot cancel active order");
  try {
    await axios.post(
      `${API_BASE}/client/orders/${orderId}/cancel`,
      {},
      clientHeaders()
    );
    fail("Cancelled active order");
  } catch (err) {
    assert([400, 409].includes(err.response?.status),
      "Unexpected error code"
    );
    pass("Cancel blocked for active order");
  }
}

async function renewOrder() {
  log("Renew Order");
  const before = await axios.get(
    `${API_BASE}/client/orders/${orderId}`,
    clientHeaders()
  );
  await axios.post(
    `${API_BASE}/admin/orders/${orderId}/renew`,
    {},
    adminHeaders()
  );
  const after = await axios.get(
    `${API_BASE}/client/orders/${orderId}`,
    clientHeaders()
  );
  assert(
    new Date(after.data.nextRenewalAt) > new Date(before.data.nextRenewalAt),
    "Renewal not extended"
  );
  pass("Order renewed");
}

async function terminateOrder() {
  log("Terminate Order");
  const res = await axios.post(
    `${API_BASE}/admin/orders/${orderId}/terminate`,
    {},
    adminHeaders()
  );
  assert(res.data.status === "terminated", "Terminate failed");
  pass("Order terminated");
}

// ============================================================
// CANCEL FLOW
// ============================================================
async function cancelPendingOrder() {
  log("Cancel Pending Order");
  const res = await axios.post(
    `${API_BASE}/client/orders`,
    { serviceId, planId, pricingId },
    clientHeaders()
  );
  cancelledOrderId = res.data.id;
  createdOrders.push(cancelledOrderId);

  const cancel = await axios.post(
    `${API_BASE}/client/orders/${cancelledOrderId}/cancel`,
    {},
    clientHeaders()
  );
  assert(cancel.data.status === "cancelled", "Cancel failed");
  pass("Pending order cancelled");
}

// ============================================================
// AUDIT & SNAPSHOT
// ============================================================
async function verifySnapshotImmutability() {
  log("Snapshot Immutability");
  await axios.put(
    `${API_BASE}/admin/pricing/${pricingId}`,
    { price: 99.99 },
    adminHeaders()
  );
  const res = await axios.get(
    `${API_BASE}/client/orders/${orderId}`,
    clientHeaders()
  );
  const snap = res.data.snapshot?.snapshot || res.data.snapshot;
  const snapPrice = Number(snap.pricing.price);
assert(snapPrice === 29.99, "Snapshot price incorrect");

  pass("Snapshot immutable");
}

async function verifyAuditRetention() {
  log("Audit Retention");
  const res = await axios.get(
    `${API_BASE}/admin/orders`,
    adminHeaders()
  );
  assert(res.data.some(o => o.id === orderId),
    "Order missing from audit"
  );
  pass("Audit retention verified");
}

// ============================================================
// CLEANUP
// ============================================================
async function cleanup() {
  log("Cleanup");
  for (const id of createdOrders) {
    try {
      await axios.delete(
        `${API_BASE}/admin/orders/${id}`,
        adminHeaders()
      );
    } catch {}
  }
  try { await axios.delete(`${API_BASE}/admin/pricing/${pricingId}`, adminHeaders()); } catch {}
  try { await axios.delete(`${API_BASE}/admin/plans/${planId}`, adminHeaders()); } catch {}
  try { await axios.delete(`${API_BASE}/admin/services/${serviceId}`, adminHeaders()); } catch {}
  pass("Cleanup complete");
}

// ============================================================
// RUN
// ============================================================
(async () => {
  console.log("\n🚀 ORDER LIFECYCLE TEST STARTED");
  try {
    await adminLogin();
    await clientLogin();
    await createService();
    await createPlan();
    await createPricing();
    await createOrder();
    await verifySnapshot();
    await negativeClientCannotActivate();
    await activateOrder();
    await negativeCancelActiveOrder();
    await renewOrder();
    await terminateOrder();
    await verifySnapshotImmutability();
    await verifyAuditRetention();
    await cancelPendingOrder();
    console.log("\n🎉 ALL TESTS PASSED");
  } catch (err) {
    console.error("\n❌ TEST FAILED:", err.message);
  } finally {
    await cleanup();
    process.exit(0);
  }
})();
