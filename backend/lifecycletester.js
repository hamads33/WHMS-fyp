/**
 * ============================================================
 * WHMS — FULL BILLING LIFECYCLE INTEGRATION TEST
 * Service → Plan → Pricing → Order → Invoice → Payment → Refund
 * ============================================================
 *
 * Prerequisites:
 *   1. Server running on localhost:4000
 *   2. node prisma/seed.js          (superadmin seeded)
 *   3. node prisma/seed.client.js   (client seeded)
 *   4. npm install axios
 *
 * Run:
 *   node test.billing.lifecycle.js
 */

process.env.NODE_ENV = "test";
const axios = require("axios");

// ============================================================
// CONFIG
// ============================================================
const API_BASE = "http://localhost:4000/api";

const ADMIN_EMAIL    = "superadmin@example.com";
const ADMIN_PASSWORD = "SuperAdmin123!";
const CLIENT_EMAIL   = "client.test@example.com";
const CLIENT_PASSWORD = "ClientPass123!";

// ============================================================
// STATE
// ============================================================
let adminToken, clientToken;
let serviceId, planId, pricingId;
let orderId, invoiceId, paymentId1, paymentId2, refundId;
let cancelOrderId;

// ============================================================
// TEST FRAMEWORK
// ============================================================
let PASS = 0, FAIL = 0;
const results = [];

function section(title) {
  console.log(`\n${"═".repeat(56)}`);
  console.log(`  ${title}`);
  console.log("═".repeat(56));
}

function pass(msg) {
  console.log(`  ✔ PASS  ${msg}`);
  PASS++;
  results.push({ status: "PASS", msg });
}

function fail(msg, detail = "") {
  console.log(`  ✖ FAIL  ${msg}${detail ? ` — ${detail}` : ""}`);
  FAIL++;
  results.push({ status: "FAIL", msg, detail });
}

function assert(condition, label, detail = "") {
  condition ? pass(label) : fail(label, detail);
}

// Axios instances — never throw on 4xx/5xx
const admin  = () => axios.create({ baseURL: API_BASE, headers: { Authorization: `Bearer ${adminToken}`  }, validateStatus: () => true });
const client = () => axios.create({ baseURL: API_BASE, headers: { Authorization: `Bearer ${clientToken}` }, validateStatus: () => true });
const anon   = () => axios.create({ baseURL: API_BASE, validateStatus: () => true });

// ============================================================
// STEP 1 — ADMIN LOGIN
// ============================================================
async function step01_adminLogin() {
  section("STEP 01 — Admin Login");

  const res = await anon().post("/auth/login", {
    email:    ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  assert(res.status === 200,          "HTTP 200 on login",          `got ${res.status}`);
  adminToken = res.data?.accessToken;
  assert(!!adminToken,                "accessToken present",        JSON.stringify(res.data));
}

// ============================================================
// STEP 2 — CLIENT LOGIN
// ============================================================
async function step02_clientLogin() {
  section("STEP 02 — Client Login");

  const res = await anon().post("/auth/login", {
    email:    CLIENT_EMAIL,
    password: CLIENT_PASSWORD,
  });

  assert(res.status === 200,           "HTTP 200 on login",         `got ${res.status}`);
  clientToken = res.data?.accessToken;
  assert(!!clientToken,                "accessToken present",       JSON.stringify(res.data));
}

// ============================================================
// STEP 3 — CREATE SERVICE (Admin)
// ============================================================
async function step03_createService() {
  section("STEP 03 — Create Service (Admin)");

  const res = await admin().post("/admin/services", {
    code:        `BILLING_TEST_${Date.now()}`,
    name:        "Billing Lifecycle Service",
    description: "Auto-generated service for billing lifecycle test",
  });

  assert(res.status === 201,           "HTTP 201 created",          `got ${res.status}`);
  assert(!!res.data?.id,               "service id present",        JSON.stringify(res.data));
  assert(res.data?.active === true,    "service is active",         res.data?.active);

  serviceId = res.data.id;
  console.log(`     serviceId: ${serviceId}`);
}

// ============================================================
// STEP 4 — CREATE PLAN (Admin)
// ============================================================
async function step04_createPlan() {
  section("STEP 04 — Create Plan (Admin)");

  const res = await admin().post(`/admin/services/${serviceId}/plans`, {
    name:     "Pro Plan",
    description: "Billing test plan",
    position: 1,
  });

  assert(res.status === 201,           "HTTP 201 created",          `got ${res.status}`);
  assert(!!res.data?.id,               "plan id present",           JSON.stringify(res.data));
  assert(res.data?.active === true,    "plan is active",            res.data?.active);

  planId = res.data.id;
  console.log(`     planId: ${planId}`);
}

// ============================================================
// STEP 5 — CREATE PRICING (Admin)
// ============================================================
async function step05_createPricing() {
  section("STEP 05 — Create Pricing (Admin)");

  const res = await admin().post(`/admin/plans/${planId}/pricing`, {
    cycle:    "monthly",
    price:    29.99,
    currency: "USD",
  });

  assert(res.status === 201,           "HTTP 201 created",          `got ${res.status}`);
  assert(!!res.data?.id,               "pricing id present",        JSON.stringify(res.data));
  assert(res.data?.cycle === "monthly","cycle is monthly",          res.data?.cycle);
  assert(Number(res.data?.price) === 29.99, "price is 29.99",       res.data?.price);

  pricingId = res.data.id;
  console.log(`     pricingId: ${pricingId}`);
}

// ============================================================
// STEP 6 — CLIENT VIEWS CATALOG
// ============================================================
async function step06_clientViewsCatalog() {
  section("STEP 06 — Client Views Active Catalog");

  const svcRes = await client().get("/client/services");
  assert(svcRes.status === 200,        "GET /client/services 200",  `got ${svcRes.status}`);
  assert(Array.isArray(svcRes.data),   "returns array",             typeof svcRes.data);

  const svc = svcRes.data.find(s => s.id === serviceId);
  assert(!!svc,                        "new service visible",       `serviceId ${serviceId} not in list`);

  const planRes = await client().get(`/client/services/${serviceId}/plans`);
  assert(planRes.status === 200,       "GET /client/services/:id/plans 200", `got ${planRes.status}`);
  assert(Array.isArray(planRes.data),  "plans is array",            typeof planRes.data);

  const plan = planRes.data.find(p => p.id === planId);
  assert(!!plan,                       "new plan visible to client", `planId ${planId} not in list`);
}

// ============================================================
// STEP 7 — CLIENT CREATES ORDER
// ============================================================
async function step07_createOrder() {
  section("STEP 07 — Client Creates Order");

  const res = await client().post("/client/orders", {
    serviceId,
    planId,
    pricingId,
  });

  assert(res.status === 201,            "HTTP 201 created",         `got ${res.status} — ${JSON.stringify(res.data)}`);
  assert(!!res.data?.id,                "order id present",         JSON.stringify(res.data));
  assert(res.data?.status === "pending","status is pending",        res.data?.status);
  assert(!!res.data?.snapshot,          "snapshot present",         !!res.data?.snapshot);

  // Verify snapshot locked correct price
  const snap = res.data.snapshot?.snapshot ?? res.data.snapshot;
  assert(Number(snap?.pricing?.price) === 29.99, "snapshot price locked at 29.99", snap?.pricing?.price);
  assert(snap?.pricing?.cycle === "monthly",      "snapshot cycle is monthly",      snap?.pricing?.cycle);

  orderId = res.data.id;
  console.log(`     orderId: ${orderId}`);
}

// ============================================================
// STEP 8 — NEGATIVE: Client cannot activate order
// ============================================================
async function step08_negative_clientCannotActivate() {
  section("STEP 08 — NEGATIVE: Client cannot activate order");

  const res = await client().post(`/admin/orders/${orderId}/activate`);
  assert(
    [401, 403, 404].includes(res.status),
    "Client blocked from admin activate",
    `got ${res.status}`
  );
}

// ============================================================
// STEP 9 — ADMIN ACTIVATES ORDER
// ============================================================
async function step09_activateOrder() {
  section("STEP 09 — Admin Activates Order");

  const res = await admin().post(`/admin/orders/${orderId}/activate`);

  assert(res.status === 200,            "HTTP 200",                 `got ${res.status} — ${JSON.stringify(res.data)}`);
  assert(res.data?.status === "active", "status is active",        res.data?.status);
  assert(!!res.data?.startedAt,         "startedAt set",           res.data?.startedAt);
  assert(!!res.data?.nextRenewalAt,     "nextRenewalAt set",       res.data?.nextRenewalAt);

  // Monthly cycle → renewal should be ~30 days out
  const days = Math.round(
    (new Date(res.data.nextRenewalAt) - new Date()) / (1000 * 60 * 60 * 24)
  );
  assert(days >= 28 && days <= 32,      `renewal ~30 days (got ${days})`, `${days} days`);
}

// ============================================================
// STEP 10 — NEGATIVE: Cannot cancel active order
// ============================================================
async function step10_negative_cannotCancelActive() {
  section("STEP 10 — NEGATIVE: Cannot cancel active order");

  const res = await client().post(`/client/orders/${orderId}/cancel`);
  assert(
    [400, 409].includes(res.status),
    "Cancel blocked for active order",
    `got ${res.status}`
  );
}

// ============================================================
// STEP 11 — GENERATE INVOICE FROM ORDER (Admin)
// ============================================================
async function step11_generateInvoice() {
  section("STEP 11 — Generate Invoice from Order (Admin)");

  const res = await admin().post(`/admin/billing/orders/${orderId}/invoice`, {
    dueDays: 7,
    notes:   "Billing lifecycle test invoice",
  });

  assert(res.status === 201,             "HTTP 201 created",          `got ${res.status} — ${JSON.stringify(res.data)}`);
  assert(!!res.data?.id,                 "invoice id present",        JSON.stringify(res.data));
  assert(!!res.data?.invoiceNumber,      "invoiceNumber present",     res.data?.invoiceNumber);
  assert(res.data?.status === "unpaid",  "status is unpaid",          res.data?.status);
  assert(Number(res.data?.totalAmount) === 29.99, "totalAmount 29.99", res.data?.totalAmount);
  assert(Number(res.data?.amountDue)   === 29.99, "amountDue 29.99",  res.data?.amountDue);
  assert(res.data?.lineItems?.length > 0,"lineItems present",         res.data?.lineItems?.length);
  assert(!!res.data?.dueDate,            "dueDate set",               res.data?.dueDate);

  invoiceId = res.data.id;
  console.log(`     invoiceId:     ${invoiceId}`);
  console.log(`     invoiceNumber: ${res.data.invoiceNumber}`);

  // Duplicate generation should be blocked (409)
  const dup = await admin().post(`/admin/billing/orders/${orderId}/invoice`, {});
  assert(dup.status === 409,             "Duplicate invoice blocked (409)", `got ${dup.status}`);
}

// ============================================================
// STEP 12 — CLIENT VIEWS INVOICE
// ============================================================
async function step12_clientViewsInvoice() {
  section("STEP 12 — Client Views Own Invoice");

  const listRes = await client().get("/client/billing/invoices");
  assert(listRes.status === 200,         "GET /client/billing/invoices 200", `got ${listRes.status}`);
  assert(Array.isArray(listRes.data),    "returns array",             typeof listRes.data);

  const found = listRes.data.find(i => i.id === invoiceId);
  assert(!!found,                        "invoice visible to client", `invoiceId ${invoiceId} not in list`);

  const getRes = await client().get(`/client/billing/invoices/${invoiceId}`);
  assert(getRes.status === 200,          "GET /client/billing/invoices/:id 200", `got ${getRes.status}`);
  assert(getRes.data?.id === invoiceId,  "correct invoice returned",  getRes.data?.id);
}

// ============================================================
// STEP 13 — APPLY DISCOUNT (Admin)
// ============================================================
async function step13_applyDiscount() {
  section("STEP 13 — Apply Discount to Invoice (Admin)");

  const res = await admin().post(`/admin/billing/invoices/${invoiceId}/discount`, {
    type:        "manual",
    description: "Lifecycle test discount",
    amount:      5.00,
    isPercent:   false,
  });

  assert(res.status === 200,              "HTTP 200",                   `got ${res.status} — ${JSON.stringify(res.data)}`);
  assert(Number(res.data?.discountAmount) === 5.00, "discountAmount 5.00", res.data?.discountAmount);
  assert(Number(res.data?.totalAmount)    === 24.99, "totalAmount now 24.99", res.data?.totalAmount);
  assert(Number(res.data?.amountDue)      === 24.99, "amountDue now 24.99",   res.data?.amountDue);
}

// ============================================================
// STEP 14 — PARTIAL PAYMENT (Admin)
// ============================================================
async function step14_partialPayment() {
  section("STEP 14 — Record Partial Payment (Admin)");

  const res = await admin().post(`/admin/billing/invoices/${invoiceId}/payments`, {
    amount:  10.00,
    gateway: "manual",
    notes:   "First partial payment",
  });

  assert(res.status === 201,              "HTTP 201 created",           `got ${res.status} — ${JSON.stringify(res.data)}`);
  assert(!!res.data?.id,                  "payment id present",         JSON.stringify(res.data));
  assert(res.data?.status === "completed","payment status completed",   res.data?.status);
  assert(Number(res.data?.amount) === 10, "payment amount 10.00",       res.data?.amount);

  paymentId1 = res.data.id;
  console.log(`     paymentId1: ${paymentId1}`);
}

// ============================================================
// STEP 15 — VERIFY INVOICE STILL UNPAID
// ============================================================
async function step15_verifyPartialState() {
  section("STEP 15 — Verify Invoice Partially Paid");

  const res = await admin().get(`/admin/billing/invoices/${invoiceId}`);

  assert(res.status === 200,              "HTTP 200",                   `got ${res.status}`);
  assert(res.data?.status === "unpaid",   "invoice still unpaid",       res.data?.status);
  assert(Number(res.data?.amountPaid) === 10.00, "amountPaid 10.00",    res.data?.amountPaid);
  assert(Number(res.data?.amountDue)  === 14.99, "amountDue 14.99",     res.data?.amountDue);
}

// ============================================================
// STEP 16 — FINAL PAYMENT (Admin)
// ============================================================
async function step16_finalPayment() {
  section("STEP 16 — Record Final Payment (Admin)");

  const res = await admin().post(`/admin/billing/invoices/${invoiceId}/payments`, {
    amount:  14.99,
    gateway: "manual",
    notes:   "Final payment",
  });

  assert(res.status === 201,              "HTTP 201 created",           `got ${res.status} — ${JSON.stringify(res.data)}`);
  assert(res.data?.status === "completed","payment completed",          res.data?.status);

  paymentId2 = res.data.id;
  console.log(`     paymentId2: ${paymentId2}`);
}

// ============================================================
// STEP 17 — VERIFY INVOICE FULLY PAID
// ============================================================
async function step17_verifyPaid() {
  section("STEP 17 — Verify Invoice Fully Paid");

  const res = await admin().get(`/admin/billing/invoices/${invoiceId}`);

  assert(res.status === 200,              "HTTP 200",                   `got ${res.status}`);
  assert(res.data?.status === "paid",     "invoice status paid",        res.data?.status);
  assert(Number(res.data?.amountPaid) === 24.99, "amountPaid 24.99",   res.data?.amountPaid);
  assert(Number(res.data?.amountDue)  === 0,     "amountDue 0",        res.data?.amountDue);
  assert(!!res.data?.paidAt,             "paidAt timestamp set",       res.data?.paidAt);
}

// ============================================================
// STEP 18 — NEGATIVE: Cannot pay already paid invoice
// ============================================================
async function step18_negative_payPaidInvoice() {
  section("STEP 18 — NEGATIVE: Cannot pay already paid invoice");

  const res = await admin().post(`/admin/billing/invoices/${invoiceId}/payments`, {
    amount: 1.00, gateway: "manual",
  });
  assert(
    [400, 409].includes(res.status),
    "Payment on paid invoice blocked",
    `got ${res.status}`
  );
}

// ============================================================
// STEP 19 — PROCESS REFUND
// ============================================================
async function step19_processRefund() {
  section("STEP 19 — Process Partial Refund (Admin)");

  const res = await admin().post(`/admin/billing/payments/${paymentId1}/refund`, {
    amount: 10.00,
    reason: "Lifecycle test refund",
  });

  assert(res.status === 201,              "HTTP 201 created",           `got ${res.status} — ${JSON.stringify(res.data)}`);
  assert(!!res.data?.id,                  "refund id present",          JSON.stringify(res.data));
  assert(Number(res.data?.amount) === 10, "refund amount 10.00",        res.data?.amount);

  refundId = res.data.id;
  console.log(`     refundId: ${refundId}`);

  // Verify invoice reverted to unpaid after refund
  const inv = await admin().get(`/admin/billing/invoices/${invoiceId}`);
  assert(inv.data?.status === "unpaid",   "invoice reverted to unpaid", inv.data?.status);
  assert(Number(inv.data?.amountPaid) === 14.99, "amountPaid reduced to 14.99", inv.data?.amountPaid);
}

// ============================================================
// STEP 20 — NEGATIVE: Over-refund blocked
// ============================================================
async function step20_negative_overRefund() {
  section("STEP 20 — NEGATIVE: Over-refund blocked");

  const res = await admin().post(`/admin/billing/payments/${paymentId2}/refund`, {
    amount: 999.00,
    reason: "Over-refund attempt",
  });
  assert(
    [400, 409].includes(res.status),
    "Over-refund blocked",
    `got ${res.status}`
  );
}

// ============================================================
// STEP 21 — SNAPSHOT IMMUTABILITY
// ============================================================
async function step21_snapshotImmutability() {
  section("STEP 21 — Snapshot Immutability After Price Change");

  // Change the live price
  await admin().put(`/admin/pricing/${pricingId}`, { price: 999.99 });

  // Snapshot on existing order must remain 29.99
  const res = await client().get(`/client/orders/${orderId}`);
  const snap = res.data?.snapshot?.snapshot ?? res.data?.snapshot;

  assert(Number(snap?.pricing?.price) === 29.99, "snapshot price unchanged at 29.99", snap?.pricing?.price);
}

// ============================================================
// STEP 22 — BILLING PROFILE
// ============================================================
async function step22_billingProfile() {
  section("STEP 22 — Client Billing Profile");

  const getRes = await client().get("/client/billing/profile");
  assert(getRes.status === 200,           "GET /client/billing/profile 200", `got ${getRes.status}`);
  assert(!!getRes.data?.id,              "profile id present",          JSON.stringify(getRes.data));

  const putRes = await client().put("/client/billing/profile", {
    currency:       "USD",
    billingAddress: "123 Test Street",
    city:           "Karachi",
    country:        "PK",
  });
  assert(putRes.status === 200,           "PUT profile 200",            `got ${putRes.status}`);
  assert(putRes.data?.country === "PK",   "country updated to PK",     putRes.data?.country);
}

// ============================================================
// STEP 23 — CLIENT BILLING SUMMARY
// ============================================================
async function step23_clientSummary() {
  section("STEP 23 — Client Billing Summary");

  const res = await client().get("/client/billing/summary");
  assert(res.status === 200,              "GET /client/billing/summary 200", `got ${res.status}`);
  assert(res.data?.totalInvoices >= 1,    "totalInvoices >= 1",         res.data?.totalInvoices);
  assert(!!res.data?.invoicesByStatus,    "invoicesByStatus present",   !!res.data?.invoicesByStatus);
}

// ============================================================
// STEP 24 — ADMIN REVENUE REPORT
// ============================================================
async function step24_revenueReport() {
  section("STEP 24 — Admin Revenue Report");

  const res = await admin().get("/admin/billing/reports/revenue");
  assert(res.status === 200,              "GET /admin/billing/reports/revenue 200", `got ${res.status}`);
  assert(!!res.data?.byStatus,            "byStatus present",           !!res.data?.byStatus);
  assert(typeof res.data?.totalCollected !== "undefined", "totalCollected present", res.data?.totalCollected);

  const monthly = await admin().get("/admin/billing/reports/monthly");
  assert(monthly.status === 200,          "monthly revenue 200",        `got ${monthly.status}`);
  assert(Array.isArray(monthly.data),     "monthly returns array",      typeof monthly.data);
  assert(monthly.data?.length === 12,     "12 months returned",         monthly.data?.length);

  const outstanding = await admin().get("/admin/billing/reports/outstanding");
  assert(outstanding.status === 200,      "outstanding balances 200",   `got ${outstanding.status}`);
}

// ============================================================
// STEP 25 — TRANSACTION AUDIT LOG
// ============================================================
async function step25_transactionLog() {
  section("STEP 25 — Transaction Audit Log");

  const res = await admin().get(`/admin/billing/reports/transactions?invoiceId=${invoiceId}`);
  assert(res.status === 200,              "GET transactions 200",       `got ${res.status}`);
  assert(Array.isArray(res.data),         "returns array",              typeof res.data);
  assert(res.data?.length > 0,           "transactions logged",         res.data?.length);

  const types = res.data.map(t => t.type);
  assert(types.includes("payment"),       "payment transactions logged", types.join(", "));
  assert(types.includes("refund"),        "refund transaction logged",   types.join(", "));
}

// ============================================================
// STEP 26 — ADMIN SUSPEND ORDER
// ============================================================
async function step26_suspendOrder() {
  section("STEP 26 — Admin Suspends Order");

  const res = await admin().post(`/admin/orders/${orderId}/suspend`);
  assert(res.status === 200,              "HTTP 200",                   `got ${res.status}`);
  assert(res.data?.status === "suspended","status is suspended",        res.data?.status);
  assert(!!res.data?.suspendedAt,         "suspendedAt set",            res.data?.suspendedAt);
}

// ============================================================
// STEP 27 — ADMIN RESUME ORDER
// ============================================================
async function step27_resumeOrder() {
  section("STEP 27 — Admin Resumes Order");

  const res = await admin().post(`/admin/orders/${orderId}/resume`);
  assert(res.status === 200,              "HTTP 200",                   `got ${res.status}`);
  assert(res.data?.status === "active",   "status is active",          res.data?.status);
  assert(res.data?.suspendedAt === null,  "suspendedAt cleared",       res.data?.suspendedAt);
}

// ============================================================
// STEP 28 — CANCEL PENDING ORDER (separate order)
// ============================================================
async function step28_cancelPendingOrder() {
  section("STEP 28 — Cancel a Pending Order (Client)");

  const orderRes = await client().post("/client/orders", { serviceId, planId, pricingId });
  assert(orderRes.status === 201,         "new pending order created",  `got ${orderRes.status}`);
  cancelOrderId = orderRes.data?.id;

  const cancelRes = await client().post(`/client/orders/${cancelOrderId}/cancel`);
  assert(cancelRes.status === 200,        "HTTP 200",                   `got ${cancelRes.status}`);
  assert(cancelRes.data?.status === "cancelled", "status is cancelled", cancelRes.data?.status);
  assert(!!cancelRes.data?.cancelledAt,   "cancelledAt set",            cancelRes.data?.cancelledAt);
}

// ============================================================
// STEP 29 — ADMIN TERMINATE ORDER
// ============================================================
async function step29_terminateOrder() {
  section("STEP 29 — Admin Terminates Order");

  const res = await admin().post(`/admin/orders/${orderId}/terminate`);
  assert(res.status === 200,              "HTTP 200",                   `got ${res.status}`);
  assert(res.data?.status === "terminated","status is terminated",      res.data?.status);
  assert(!!res.data?.terminatedAt,        "terminatedAt set",           res.data?.terminatedAt);

  // NEGATIVE: terminate again should 409
  const dup = await admin().post(`/admin/orders/${orderId}/terminate`);
  assert(dup.status === 409,              "Double terminate blocked (409)", `got ${dup.status}`);
}

// ============================================================
// STEP 30 — ADMIN ORDER STATS
// ============================================================
async function step30_orderStats() {
  section("STEP 30 — Admin Order Stats");

  const res = await admin().get("/admin/orders/stats");
  assert(res.status === 200,              "GET /admin/orders/stats 200", `got ${res.status}`);
  assert(typeof res.data === "object",    "returns object",              typeof res.data);
  assert(typeof res.data?.terminated !== "undefined", "terminated count present", JSON.stringify(res.data));
}

// ============================================================
// CLEANUP
// ============================================================
async function cleanup() {
  section("CLEANUP");
  // Services module has deactivate (DELETE) not hard delete — that's fine
  try { await admin().delete(`/admin/services/${serviceId}`); } catch {}
  console.log("  ✔ Cleanup done (service deactivated)");
}

// ============================================================
// MAIN RUNNER
// ============================================================
(async () => {
  console.log("\n🚀 WHMS FULL BILLING LIFECYCLE TEST");
  console.log(`   API: ${API_BASE}`);
  console.log(`   Admin: ${ADMIN_EMAIL}`);
  console.log(`   Client: ${CLIENT_EMAIL}`);

  const steps = [
    step01_adminLogin,
    step02_clientLogin,
    step03_createService,
    step04_createPlan,
    step05_createPricing,
    step06_clientViewsCatalog,
    step07_createOrder,
    step08_negative_clientCannotActivate,
    step09_activateOrder,
    step10_negative_cannotCancelActive,
    step11_generateInvoice,
    step12_clientViewsInvoice,
    step13_applyDiscount,
    step14_partialPayment,
    step15_verifyPartialState,
    step16_finalPayment,
    step17_verifyPaid,
    step18_negative_payPaidInvoice,
    step19_processRefund,
    step20_negative_overRefund,
    step21_snapshotImmutability,
    step22_billingProfile,
    step23_clientSummary,
    step24_revenueReport,
    step25_transactionLog,
    step26_suspendOrder,
    step27_resumeOrder,
    step28_cancelPendingOrder,
    step29_terminateOrder,
    step30_orderStats,
  ];

  for (const step of steps) {
    try {
      await step();
    } catch (err) {
      fail(`${step.name} threw unexpectedly`, err.message);
    }
  }

  await cleanup();

  // ── FINAL SUMMARY ────────────────────────────────────────
  console.log(`\n${"═".repeat(56)}`);
  console.log("  📊 FINAL RESULTS");
  console.log("═".repeat(56));
  console.log(`  ✔ Passed : ${PASS}`);
  console.log(`  ✖ Failed : ${FAIL}`);
  console.log("═".repeat(56));

  if (FAIL === 0) {
    console.log("  🎉 ALL TESTS PASSED — BILLING LIFECYCLE COMPLETE");
  } else {
    console.log("  ⚠️  SOME TESTS FAILED — review output above");
    console.log("\n  Failed tests:");
    results.filter(r => r.status === "FAIL").forEach(r => {
      console.log(`    ✖ ${r.msg}${r.detail ? ` (${r.detail})` : ""}`);
    });
  }

  console.log("\n  📌 IDs from this run:");
  console.log(`     serviceId : ${serviceId}`);
  console.log(`     planId    : ${planId}`);
  console.log(`     pricingId : ${pricingId}`);
  console.log(`     orderId   : ${orderId}`);
  console.log(`     invoiceId : ${invoiceId}`);
  console.log(`     paymentId1: ${paymentId1}`);
  console.log(`     paymentId2: ${paymentId2}`);
  console.log(`     refundId  : ${refundId}`);

  process.exit(FAIL > 0 ? 1 : 0);
})();