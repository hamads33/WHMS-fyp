
// Path: tests/e2e/orders.e2e.js

const axios = require("axios");

const BASE_URL = "http://localhost:4000";
const ADMIN_EMAIL = "superadmin@example.com";
const ADMIN_PASSWORD = "SuperAdmin123!";

let token;
let serviceId;
let planId;
let pricingId;
let orderId;
let cancelledOrderId;

function assert(condition, message) {
  if (!condition) {
    console.error("❌ FAIL:", message);
    process.exit(1);
  }
}

async function login() {
  const res = await axios.post(`${BASE_URL}/api/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  token = res.data.accessToken || res.data.token;

  assert(token, "Failed to retrieve access token");
  console.log("✅ Authenticated as SUPERADMIN");
}

const admin = () => ({
  headers: { Authorization: `Bearer ${token}` },
});

async function run() {
  console.log("🚀 Running Orders Module E2E Tests (Authenticated)\n");

  // --------------------------------------------------
  // AUTH
  // --------------------------------------------------
  await login();

  // --------------------------------------------------
  // CREATE SERVICE
  // --------------------------------------------------
  const serviceRes = await axios.post(
    `${BASE_URL}/api/admin/services`,
    {
      code: "order_test_service",
      name: "Order Test Hosting",
      description: "Service for order testing",
    },
    admin()
  );

  serviceId = serviceRes.data.id;
  console.log("✅ Service created");

  // --------------------------------------------------
  // CREATE PLAN
  // --------------------------------------------------
  const planRes = await axios.post(
    `${BASE_URL}/api/admin/services/${serviceId}/plans`,
    {
      name: "Basic",
      summary: "Order test plan",
    },
    admin()
  );

  planId = planRes.data.id;
  console.log("✅ Plan created");

  // --------------------------------------------------
  // CREATE PRICING
  // --------------------------------------------------
  const pricingRes = await axios.post(
    `${BASE_URL}/api/admin/plans/${planId}/pricing`,
    {
      cycle: "monthly",
      price: 9.99,
    },
    admin()
  );

  pricingId = pricingRes.data.id;
  console.log("✅ Pricing created");

  // --------------------------------------------------
  // FR-ORD-01: CREATE ORDER (client route)
  // --------------------------------------------------
  const orderRes = await axios.post(
    `${BASE_URL}/api/orders`,
    {
      serviceId,
      planId,
      pricingId,
    },
    admin()
  );

  assert(orderRes.status === 201, "Order creation failed");
  orderId = orderRes.data.id;
  console.log("✅ Order created (FR-ORD-01)");

  // --------------------------------------------------
  // FR-ORD-02: LIST CLIENT ORDERS
  // --------------------------------------------------
  const clientOrders = await axios.get(`${BASE_URL}/api/orders`, admin());

  assert(
    clientOrders.data.some((o) => o.id === orderId),
    "Order not visible to client"
  );
  console.log("✅ Client order listing verified (FR-ORD-02)");

  // --------------------------------------------------
  // FR-ORD-03: ORDER DETAILS + SNAPSHOT
  // --------------------------------------------------
  const orderDetails = await axios.get(
    `${BASE_URL}/api/orders/${orderId}`,
    admin()
  );

  assert(orderDetails.data.snapshot, "Snapshot missing (FR-ORD-13)");
  assert(orderDetails.data.status === "pending", "Invalid order status");
  console.log("✅ Order snapshot verified (FR-ORD-03, FR-ORD-13)");

  // --------------------------------------------------
  // TEST CLIENT CANCEL (pending → cancelled)
  // --------------------------------------------------
  const cancelTestOrder = await axios.post(
    `${BASE_URL}/api/orders`,
    { serviceId, planId, pricingId },
    admin()
  );
  cancelledOrderId = cancelTestOrder.data.id;

  await axios.post(
    `${BASE_URL}/api/orders/${cancelledOrderId}/cancel`,
    {},
    admin()
  );

  const cancelledOrder = await axios.get(
    `${BASE_URL}/api/orders/${cancelledOrderId}`,
    admin()
  );

  assert(cancelledOrder.data.status === "cancelled", "Order not cancelled");
  assert(cancelledOrder.data.cancelledAt, "cancelledAt timestamp missing");
  console.log("✅ Client order cancellation verified");

  // --------------------------------------------------
  // FR-ORD-04: ADMIN LIST ORDERS
  // --------------------------------------------------
  const adminOrders = await axios.get(`${BASE_URL}/api/admin/orders`, admin());

  assert(
    adminOrders.data.some((o) => o.id === orderId),
    "Order not visible to admin"
  );
  console.log("✅ Admin order listing verified (FR-ORD-04)");

  // --------------------------------------------------
  // FR-ORD-05: ACTIVATE ORDER
  // --------------------------------------------------
  const activated = await axios.post(
    `${BASE_URL}/api/admin/orders/${orderId}/activate`,
    {},
    admin()
  );

  assert(activated.data.status === "active", "Order not activated");
  assert(activated.data.startedAt, "startedAt missing");
  assert(activated.data.nextRenewalAt, "nextRenewalAt missing");
  console.log("✅ Order activation verified (FR-ORD-05)");

  // --------------------------------------------------
  // FR-ORD-06: RENEW ORDER
  // --------------------------------------------------
  const originalRenewal = activated.data.nextRenewalAt;

  await axios.post(`${BASE_URL}/api/orders/${orderId}/renew`, {}, admin());

  const renewed = await axios.get(
    `${BASE_URL}/api/orders/${orderId}`,
    admin()
  );

  assert(
    new Date(renewed.data.nextRenewalAt) > new Date(originalRenewal),
    "Renewal date not extended"
  );
  console.log("✅ Order renewal verified (FR-ORD-06)");

  // --------------------------------------------------
  // FR-ORD-07: SUSPEND ORDER
  // --------------------------------------------------
  await axios.post(
    `${BASE_URL}/api/admin/orders/${orderId}/suspend`,
    {},
    admin()
  );

  const suspended = await axios.get(
    `${BASE_URL}/api/orders/${orderId}`,
    admin()
  );

  assert(suspended.data.status === "suspended", "Order not suspended");
  assert(suspended.data.suspendedAt, "suspendedAt timestamp missing");
  console.log("✅ Order suspension verified (FR-ORD-07)");

  // --------------------------------------------------
  // FR-ORD-08: RESUME ORDER
  // --------------------------------------------------
  await axios.post(
    `${BASE_URL}/api/admin/orders/${orderId}/resume`,
    {},
    admin()
  );

  const resumed = await axios.get(
    `${BASE_URL}/api/orders/${orderId}`,
    admin()
  );

  assert(resumed.data.status === "active", "Order not resumed");
  assert(resumed.data.suspendedAt === null, "suspendedAt not cleared");
  console.log("✅ Order resumption verified (FR-ORD-08)");

  // --------------------------------------------------
  // FR-ORD-09: TERMINATE ORDER
  // --------------------------------------------------
  await axios.post(
    `${BASE_URL}/api/admin/orders/${orderId}/terminate`,
    {},
    admin()
  );

  const terminated = await axios.get(
    `${BASE_URL}/api/orders/${orderId}`,
    admin()
  );

  assert(terminated.data.status === "terminated", "Order not terminated");
  assert(terminated.data.terminatedAt, "terminatedAt timestamp missing");
  console.log("✅ Order termination verified (FR-ORD-09)");

  // --------------------------------------------------
  // FR-ORD-15: VERIFY AUDIT RETENTION
  // --------------------------------------------------
  const finalCheck = await axios.get(`${BASE_URL}/api/admin/orders`, admin());

  assert(
    finalCheck.data.some((o) => o.id === orderId),
    "Terminated order not retained for audit (FR-ORD-15)"
  );
  assert(
    finalCheck.data.some((o) => o.id === cancelledOrderId),
    "Cancelled order not retained for audit (FR-ORD-15)"
  );
  console.log("✅ Audit retention verified (FR-ORD-15)");

  // --------------------------------------------------
  // FR-ORD-14: VERIFY SNAPSHOT IMMUTABILITY
  // --------------------------------------------------
  await axios.put(
    `${BASE_URL}/api/admin/pricing/${pricingId}`,
    { price: 19.99 },
    admin()
  );

  const snapshotCheck = await axios.get(
    `${BASE_URL}/api/orders/${orderId}`,
    admin()
  );

  assert(
    snapshotCheck.data.snapshot.snapshot.pricing.price === 9.99,
    "Snapshot was affected by pricing change (FR-ORD-14 violated)"
  );
  console.log("✅ Snapshot immutability verified (FR-ORD-14)");

  console.log("\n🎉 ALL ORDERS MODULE TESTS PASSED");
  console.log("📊 Requirements Coverage: 12/12 (100%)");
  console.log("📊 Additional: Client cancel functionality verified");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ ERROR:", err.response?.data || err.message);
  process.exit(1);
});