// src/modules/plugins/plugin-test.js
// Plugin Engine / Invoice Manager Tests

"use strict";

const path = require("path");
const fs = require("fs");

// ===================================================
// STABLE PATH RESOLUTION (DO NOT USE process.cwd())
// ===================================================

// This file is at: src/modules/plugins/plugin-test.js
// Backend root is: ../../..
const BACKEND_ROOT = path.resolve(__dirname, "../../..");

// Canonical plugin directory
const PLUGIN_BASE = path.join(
  BACKEND_ROOT,
  "plugins",
  "actions",
  "invoice-manager"
);

// ===================================================
// SANITY CHECKS (FAIL FAST)
// ===================================================

if (!fs.existsSync(PLUGIN_BASE)) {
  console.error("❌ Plugin directory not found:");
  console.error("   ", PLUGIN_BASE);
  console.error("\nExpected structure:");
  console.error("  backend/plugins/actions/invoice-manager\n");
  process.exit(1);
}

if (!fs.existsSync(path.join(PLUGIN_BASE, "index.js"))) {
  console.error("❌ Plugin entry file missing:");
  console.error("   ", path.join(PLUGIN_BASE, "index.js"));
  process.exit(1);
}

// ===================================================
// COLOR UTILS
// ===================================================

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m"
};

const results = { passed: 0, failed: 0, tests: [] };

// ===================================================
// MOCK LOGGER
// ===================================================

const mockLogger = {
  info: msg => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  warn: msg => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: msg => console.log(`${colors.red}❌ ${msg}${colors.reset}`)
};

// ===================================================
// MOCK CONTEXT (MATCHES PLUGIN ENGINE CONTRACT)
// ===================================================

function createMockContext(meta = {}) {
  return {
    meta,
    logger: mockLogger,
    prisma: {
      invoice: {
        create: async data => ({ id: `INV-${Date.now()}`, ...data }),
        findUnique: async () => ({
          id: "INV-123",
          clientId: "client-123",
          status: "draft",
          items: [],
          total: 100
        }),
        findMany: async () => [],
        update: async data => ({ ...data, updatedAt: new Date().toISOString() })
      }
    },
    registry: { getHooks: () => [] },
    app: {}
  };
}

// ===================================================
// TEST HARNESS
// ===================================================

function logTest(name, status, err) {
  const icon = status === "PASS" ? "✅" : "❌";
  const color = status === "PASS" ? colors.green : colors.red;
  console.log(`${color}${icon} ${name}${colors.reset}`);
  if (err) console.log(`${colors.red}   ${err}${colors.reset}`);
}

async function test(suite, name, fn) {
  const label = `${suite} › ${name}`;
  try {
    await fn();
    results.passed++;
    logTest(label, "PASS");
  } catch (e) {
    results.failed++;
    logTest(label, "FAIL", e.message);
  }
}

// ===================================================
// ASSERTIONS
// ===================================================

const assert = {
  true: (v, m) => { if (!v) throw new Error(m); },
  false: (v, m) => { if (v) throw new Error(m); },
  equal: (a, b, m) => { if (a !== b) throw new Error(`${m} (got ${a})`); },
  exists: (v, m) => { if (v === undefined || v === null) throw new Error(m); },
  array: (v, m) => { if (!Array.isArray(v)) throw new Error(m); },
  prop: (o, p, m) => { if (!(p in o)) throw new Error(m); }
};

// ===================================================
// LOAD ACTIONS (FIXED PATHS)
// ===================================================

const initPlugin     = require(path.join(PLUGIN_BASE, "index.js"));
const createInvoice  = require(path.join(PLUGIN_BASE, "actions/createInvoice.js"));
const sendInvoice    = require(path.join(PLUGIN_BASE, "actions/sendInvoice.js"));
const getInvoice     = require(path.join(PLUGIN_BASE, "actions/getInvoice.js"));
const generatePDF    = require(path.join(PLUGIN_BASE, "actions/generatePDF.js"));
const listInvoices   = require(path.join(PLUGIN_BASE, "actions/listInvoices.js"));
const updateInvoice  = require(path.join(PLUGIN_BASE, "actions/updateInvoice.js"));
const analytics      = require(path.join(PLUGIN_BASE, "actions/calculateAnalytics.js"));
const markPaid       = require(path.join(PLUGIN_BASE, "actions/markPaid.js"));

// ===================================================
// TEST SUITES
// ===================================================

async function testInitialization() {
  console.log(`\n${colors.blue}■ Initialization${colors.reset}`);
  await test("Init", "plugin loads", async () => {
   const mockApp = {
  use: () => {},        // allow app.use(...)
  locals: {}            // plugin engine may store things here
};

const res = await initPlugin({
  logger: mockLogger,
  plugin: { id: "invoice-manager", name: "Invoice Manager", version: "2.0.0" },
  registry: {},
  app: mockApp
});

    assert.equal(res.status, "ready", "status ready");
  });
}

async function testCreateInvoice() {
  console.log(`\n${colors.blue}■ Create Invoice${colors.reset}`);
  await test("Create", "valid invoice", async () => {
    const r = await createInvoice.handler(createMockContext({
      clientId: "c1",
      items: [{ quantity: 2, unitPrice: 100 }],
      dueDate: "2024-02-01"
    }));
    assert.true(r.success, "success");
    assert.equal(r.invoice.total, 220, "total");
  });
}

async function testSendInvoice() {
  console.log(`\n${colors.blue}■ Send Invoice${colors.reset}`);
  await test("Send", "valid email", async () => {
    const r = await sendInvoice.handler(createMockContext({
      invoiceId: "INV-1",
      recipientEmail: "a@b.com"
    }));
    assert.true(r.success, "sent");
  });
}

async function testGetInvoice() {
  console.log(`\n${colors.blue}■ Get Invoice${colors.reset}`);
  await test("Get", "fetch invoice", async () => {
    const r = await getInvoice.handler(createMockContext({ invoiceId: "INV-1" }));
    assert.true(r.success, "fetched");
  });
}

async function testGeneratePDF() {
  console.log(`\n${colors.blue}■ Generate PDF${colors.reset}`);
  await test("PDF", "generate", async () => {
    const r = await generatePDF.handler(createMockContext({ invoiceId: "INV-1" }));
    assert.true(r.success, "generated");
    assert.prop(r.pdf, "buffer", "buffer exists");
  });
}

async function testListInvoices() {
  console.log(`\n${colors.blue}■ List Invoices${colors.reset}`);
  await test("List", "returns list", async () => {
    const r = await listInvoices.handler(createMockContext({}));
    assert.true(r.success, "listed");
    assert.array(r.invoices, "array");
  });
}

async function testUpdateInvoice() {
  console.log(`\n${colors.blue}■ Update Invoice${colors.reset}`);
  await test("Update", "updates invoice", async () => {
    const r = await updateInvoice.handler(createMockContext({
      invoiceId: "INV-1",
      updates: { notes: "ok" }
    }));
    assert.true(r.success, "updated");
  });
}

async function testAnalytics() {
  console.log(`\n${colors.blue}■ Analytics${colors.reset}`);
  await test("Analytics", "calculates", async () => {
    const r = await analytics.handler(createMockContext({ period: "month" }));
    assert.true(r.success, "calculated");
  });
}

async function testMarkPaid() {
  console.log(`\n${colors.blue}■ Mark Paid${colors.reset}`);
  await test("Paid", "marks paid", async () => {
    const r = await markPaid.handler(createMockContext({ invoiceId: "INV-1" }));
    assert.true(r.success, "paid");
  });
}

// ===================================================
// RUNNER
// ===================================================

(async function run() {
  console.log("\n════════ Invoice Manager Plugin Tests ════════");
  const start = Date.now();

  await testInitialization();
  await testCreateInvoice();
  await testSendInvoice();
  await testGetInvoice();
  await testGeneratePDF();
  await testListInvoices();
  await testUpdateInvoice();
  await testAnalytics();
  await testMarkPaid();

  const time = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`\n${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`⏱ ${time}s\n`);

  process.exit(results.failed ? 1 : 0);
})();
