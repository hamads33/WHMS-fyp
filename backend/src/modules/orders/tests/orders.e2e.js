/**
 * Orders Module – End-to-End Tests (Authenticated)
 * Uses seeded SUPERADMIN user
 */

const axios = require("axios");

const BASE_URL = "http://localhost:4000";
const ADMIN_EMAIL = "superadmin@example.com";
const ADMIN_PASSWORD = "SuperAdmin123!";

let token;
let serviceId;
let planId;
let pricingId;
let orderId;

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

  // 🔴 adjust key if your API uses a different name
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
  // CREATE ORDER (client route, admin token still valid)
  // --------------------------------------------------
  const orderRes = await axios.post(
    `${BASE_URL}/api/client/orders`,
    {
      serviceId,
      planId,
      pricingId,
    },
    admin()
  );

  assert(orderRes.status === 201, "Order creation failed");
  orderId = orderRes.data.id;
  console.log("✅ Order created");

  // --------------------------------------------------
  // LIST CLIENT ORDERS
  // --------------------------------------------------
  const clientOrders = await axios.get(
    `${BASE_URL}/api/client/orders`,
    admin()
  );

  assert(
    clientOrders.data.some((o) => o.id === orderId),
    "Order not visible to client"
  );
  console.log("✅ Client order listing verified");

  // --------------------------------------------------
  // ORDER DETAILS + SNAPSHOT
  // --------------------------------------------------
  const orderDetails = await axios.get(
    `${BASE_URL}/api/client/orders/${orderId}`,
    admin()
  );

  assert(orderDetails.data.snapshot, "Snapshot missing");
  assert(orderDetails.data.status === "pending", "Invalid order status");
  console.log("✅ Order snapshot verified");

  // --------------------------------------------------
  // ADMIN LIST ORDERS
  // --------------------------------------------------
  const adminOrders = await axios.get(
    `${BASE_URL}/api/admin/orders`,
    admin()
  );

  assert(
    adminOrders.data.some((o) => o.id === orderId),
    "Order not visible to admin"
  );
  console.log("✅ Admin order listing verified");

  // --------------------------------------------------
  // CANCEL ORDER
  // --------------------------------------------------
  await axios.post(
    `${BASE_URL}/api/client/orders/${orderId}/cancel`,
    {},
    admin()
  );

  const cancelled = await axios.get(
    `${BASE_URL}/api/client/orders/${orderId}`,
    admin()
  );

  assert(
    cancelled.data.status === "cancelled",
    "Order not cancelled correctly"
  );
  console.log("✅ Order cancellation verified");

  console.log("\n🎉 ALL ORDERS MODULE TESTS PASSED");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ ERROR:", err.response?.data || err.message);
  process.exit(1);
});
