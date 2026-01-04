/**
 * Simple Order Module Validation Test
 * Run: node order.simple.test.js
 *
 * Purpose:
 * - Verify order creation works
 * - Verify admin activation works
 * - Verify basic lifecycle flow
 */

const axios = require("axios");

const BASE_URL = "http://localhost:4000";
const EMAIL = "superadmin@example.com";
const PASSWORD = "SuperAdmin123!";

let token;
let serviceId;
let planId;
let pricingId;
let orderId;

function assert(condition, message) {
  if (!condition) {
    console.error("❌ TEST FAILED:", message);
    process.exit(1);
  }
}

async function login() {
  console.log("🔐 Logging in...");

  const res = await axios.post(`${BASE_URL}/api/auth/login`, {
    email: EMAIL,
    password: PASSWORD,
  });

  token = res.data.accessToken || res.data.token;
  assert(token, "Token not received");

  console.log("✅ Logged in");
}

function auth() {
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
}

async function setupService() {
  console.log("🛠 Creating service...");

  const service = await axios.post(
    `${BASE_URL}/api/admin/services`,
    {
      code: "test_order_service",
      name: "Order Test Service",
      description: "Service for order module testing",
    },
    auth()
  );

  serviceId = service.data.id;
  assert(serviceId, "Service ID missing");

  const plan = await axios.post(
    `${BASE_URL}/api/admin/services/${serviceId}/plans`,
    {
      name: "Basic Plan",
      description: "Basic testing plan",
    },
    auth()
  );

  planId = plan.data.id;
  assert(planId, "Plan ID missing");

  const pricing = await axios.post(
    `${BASE_URL}/api/admin/plans/${planId}/pricing`,
    {
      cycle: "monthly",
      price: 10,
    },
    auth()
  );

  pricingId = pricing.data.id;
  assert(pricingId, "Pricing ID missing");

  console.log("✅ Service, plan & pricing created");
}

async function createOrder() {
  console.log("📦 Creating order...");

  const res = await axios.post(
    `${BASE_URL}/api/client/orders`,
    { serviceId, planId, pricingId },
    auth()
  );

  assert(res.status === 201, "Order creation failed");
  assert(res.data.status === "pending", "Order not pending");

  orderId = res.data.id;
  assert(orderId, "Order ID missing");

  console.log("✅ Order created (pending)");
}

async function activateOrder() {
  console.log("⚙️ Activating order...");

  const res = await axios.post(
    `${BASE_URL}/api/admin/orders/${orderId}/activate`,
    {},
    auth()
  );

  assert(res.data.status === "active", "Order not activated");
  console.log("✅ Order activated");
}

async function run() {
  try {
    await login();
    await setupService();
    await createOrder();
    await activateOrder();

    console.log("\n🎉 ORDER MODULE BASIC TEST PASSED");
    process.exit(0);
  } catch (err) {
    console.error(
      "❌ ERROR:",
      err.response?.data || err.message
    );
    process.exit(1);
  }
}

run();
