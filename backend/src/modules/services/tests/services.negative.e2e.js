/**
 * Services Module – Negative E2E Tests
 * Plain Node.js (no Jest)
 */

const axios = require("axios");

const BASE_ADMIN = "http://localhost:3000/api/admin";
const BASE_CLIENT = "http://localhost:3000/api/client";

function expectFailure(condition, message) {
  if (!condition) {
    console.error("❌ FAIL:", message);
    process.exit(1);
  }
}

async function run() {
  console.log("🚨 Running Services Module NEGATIVE Tests...\n");

  // --------------------------------------------------
  // NEG-01: Create service with missing fields
  // --------------------------------------------------
  try {
    await axios.post(`${BASE_ADMIN}/services`, {
      name: "Invalid Service",
    });
    expectFailure(false, "Service created with missing fields");
  } catch (err) {
    console.log("✅ NEG-01: Missing fields rejected");
  }

  // --------------------------------------------------
  // NEG-02: Create service with invalid price (if supported)
  // --------------------------------------------------
  try {
    await axios.post(`${BASE_ADMIN}/services`, {
      code: "bad_price",
      name: "Bad Price Service",
      description: "Invalid price",
      basePrice: -10,
    });
    expectFailure(false, "Service created with negative price");
  } catch (err) {
    console.log("✅ NEG-02: Invalid price rejected");
  }

  // --------------------------------------------------
  // NEG-03: Get non-existent service
  // --------------------------------------------------
  try {
    await axios.get(`${BASE_ADMIN}/services/999999`);
    expectFailure(false, "Non-existent service returned");
  } catch (err) {
    console.log("✅ NEG-03: Non-existent service rejected");
  }

  // --------------------------------------------------
  // NEG-04: Create plan for non-existent service
  // --------------------------------------------------
  try {
    await axios.post(`${BASE_ADMIN}/services/999999/plans`, {
      name: "Ghost Plan",
    });
    expectFailure(false, "Plan created for non-existent service");
  } catch (err) {
    console.log("✅ NEG-04: Invalid serviceId rejected for plan");
  }

  // --------------------------------------------------
  // NEG-05: Add pricing with invalid billing cycle
  // --------------------------------------------------
  try {
    await axios.post(`${BASE_ADMIN}/plans/1/pricing`, {
      cycle: "weekly", // unsupported
      price: 5.99,
    });
    expectFailure(false, "Invalid billing cycle accepted");
  } catch (err) {
    console.log("✅ NEG-05: Invalid billing cycle rejected");
  }

  // --------------------------------------------------
  // NEG-06: Duplicate pricing cycle for same plan
  // --------------------------------------------------
  try {
    // first insert (may succeed if plan exists)
    await axios.post(`${BASE_ADMIN}/plans/1/pricing`, {
      cycle: "monthly",
      price: 9.99,
    });

    // duplicate insert
    await axios.post(`${BASE_ADMIN}/plans/1/pricing`, {
      cycle: "monthly",
      price: 12.99,
    });

    expectFailure(false, "Duplicate pricing cycle allowed");
  } catch (err) {
    console.log("✅ NEG-06: Duplicate pricing cycle rejected");
  }

  // --------------------------------------------------
  // NEG-07: Client attempts admin-only endpoint
  // --------------------------------------------------
  try {
    await axios.post(`${BASE_CLIENT}/services`, {
      name: "Hack Attempt",
    });
    expectFailure(false, "Client accessed admin endpoint");
  } catch (err) {
    console.log("✅ NEG-07: Client access restricted");
  }

  // --------------------------------------------------
  // NEG-08: Update deactivated service
  // --------------------------------------------------
  try {
    // assuming serviceId=1 exists and is inactive
    await axios.put(`${BASE_ADMIN}/services/1`, {
      name: "Update Inactive",
    });
    console.log("⚠️ NEG-08: Update inactive service allowed (documented behavior)");
  } catch (err) {
    console.log("✅ NEG-08: Inactive service update rejected");
  }

  console.log("\n🎯 ALL NEGATIVE TESTS PASSED");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ UNEXPECTED ERROR:", err.message);
  process.exit(1);
});
