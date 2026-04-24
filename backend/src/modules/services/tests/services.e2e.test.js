/**
 * Simple E2E test for Services Module
 * No Jest. No mocks. Plain Node.
 */

const axios = require("axios");

const BASE_ADMIN = "http://localhost:4000/api/admin";
const BASE_CLIENT = "http://localhost:4000/api/client";

let serviceId;
let planId;
let pricingId;

function assert(condition, message) {
  if (!condition) {
    console.error("❌ FAIL:", message);
    process.exit(1);
  }
}

async function run() {
  console.log("🚀 Running Services Module E2E Tests...\n");

  // ---------------------------
  // CREATE SERVICE
  // ---------------------------
  const serviceRes = await axios.post(`${BASE_ADMIN}/services`, {
    code: "shared_hosting",
    name: "Shared Hosting",
    description: "Linux shared hosting",
  });

  assert(serviceRes.status === 201, "Service creation failed");
  serviceId = serviceRes.data.id;
  console.log("✅ Service created");

  // ---------------------------
  // CREATE PLAN
  // ---------------------------
  const planRes = await axios.post(
    `${BASE_ADMIN}/services/${serviceId}/plans`,
    {
      name: "Basic",
      summary: "Basic hosting plan",
    }
  );

  assert(planRes.status === 201, "Plan creation failed");
  planId = planRes.data.id;
  console.log("✅ Plan created");

  // ---------------------------
  // ADD PRICING
  // ---------------------------
  const pricingRes = await axios.post(
    `${BASE_ADMIN}/plans/${planId}/pricing`,
    {
      cycle: "monthly",
      price: 9.99,
    }
  );

  assert(pricingRes.status === 201, "Pricing creation failed");
  pricingId = pricingRes.data.id;
  console.log("✅ Pricing added");

  // ---------------------------
  // CLIENT VISIBILITY
  // ---------------------------
  const clientRes = await axios.get(`${BASE_CLIENT}/services`);
  const ids = clientRes.data.map((s) => s.id);

  assert(ids.includes(serviceId), "Service not visible to client");
  console.log("✅ Client visibility verified");

  // ---------------------------
  // DEACTIVATE SERVICE
  // ---------------------------
  const delRes = await axios.delete(
    `${BASE_ADMIN}/services/${serviceId}`
  );

  assert(delRes.status === 204, "Service deactivation failed");
  console.log("✅ Service deactivated");

  // ---------------------------
  // CLIENT SHOULD NOT SEE IT
  // ---------------------------
  const clientRes2 = await axios.get(`${BASE_CLIENT}/services`);
  const ids2 = clientRes2.data.map((s) => s.id);

  assert(!ids2.includes(serviceId), "Inactive service visible to client");
  console.log("✅ Inactive service hidden from client");

  console.log("\n🎉 ALL SERVICES MODULE TESTS PASSED");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ ERROR:", err.response?.data || err.message);
  process.exit(1);
});
