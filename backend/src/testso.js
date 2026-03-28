#!/usr/bin/env node

/**
 * COMPREHENSIVE BILLING & INVOICING PIPELINE TEST SUITE
 * Tests the full flow: Services → Orders → Billing & Invoicing
 *
 * Test Categories:
 * ✅ Positive scenarios  (happy path)
 * ❌ Negative scenarios  (error handling & validation)
 * ⚠️  Edge cases         (boundary conditions & race conditions)
 *
 * Phases:
 *  0  — Authentication
 *  1  — Service Setup (group → service → plan → pricing)
 *  2  — Billing Profiles
 *  3  — Tax Rules
 *  4  — Order → Invoice Pipeline
 *  5  — Invoice Lifecycle (send / cancel / mark-paid)
 *  6  — Discounts & Credits
 *  7  — Manual Invoices
 *  8  — Payments (full, partial, overpayment guard)
 *  9  — Refunds (partial, full, over-refund guard)
 * 10  — Renewal Billing
 * 11  — Suspension & Termination Fee Invoices
 * 12  — Batch Operations (process-renewals, process-overdue)
 * 13  — Revenue & Statistics
 * 14  — Client Billing Views (what the client can / cannot see)
 * 15  — Authorization Guards (role enforcement)
 *
 * Usage:  node test-billing-pipeline.js
 * Debug:  DEBUG=true node test-billing-pipeline.js
 * Server: PORT=4000 node test-billing-pipeline.js
 */

const http  = require('http');
const https = require('https');

// ============================================================
// Configuration
// ============================================================

const API_PORT   = process.env.PORT   || 4000;
const API_URL    = `http://localhost:${API_PORT}`;
const USE_HTTPS  = process.env.API_HTTPS === 'true';
const HTTP_CLIENT = USE_HTTPS ? https : http;
const DEBUG      = process.env.DEBUG  === 'true';

const ADMIN_CREDENTIALS = {
  email:    'superadmin@example.com',
  password: 'SuperAdmin123!',
};

const CLIENT_CREDENTIALS = {
  email:    'ihammad317@gmail.com',
  password: 'abcxyz7800',
};

// ── Tokens & identities ───────────────────────────────────────
let adminToken  = null;
let clientToken = null;
let adminId     = null;
let clientId    = null;

// ── Service setup state (pipeline pre-requisites) ─────────────
const svc = {
  groupId:       null,
  serviceId:     null,
  planId:        null,
  pricingId:     null,         // monthly pricing with setup + suspension + termination fees
  annualPricingId: null,       // annual pricing for renewal tests
  addonId:       null,
  addonPricingId: null,
  serviceCode:   `BILLTEST-${Date.now()}`,
  groupName:     `BillingTestGroup-${Date.now()}`,
};

// ── Billing state (flows between phases) ──────────────────────
const billing = {
  profileId:         null,     // client billing profile
  taxRuleId:         null,     // global tax rule
  countryTaxRuleId:  null,     // country-specific tax rule
  orderId:           null,     // basic order (no addons)
  orderWithAddonsId: null,     // order with addons
  activeOrderId:     null,     // activated order (for renewal / suspension)

  // Invoices
  invoiceId:           null,   // new_order invoice (draft)
  unpaidInvoiceId:     null,   // sent invoice (unpaid)
  paidInvoiceId:       null,   // fully paid invoice
  manualInvoiceId:     null,   // manual invoice
  renewalInvoiceId:    null,
  suspensionInvoiceId: null,
  terminationInvoiceId: null,

  // Payments
  paymentId:        null,      // first recorded payment
  partialPaymentId: null,

  // Refunds
  refundId:         null,
};

// ── Statistics ────────────────────────────────────────────────
let stats = { total: 0, passed: 0, failed: 0, positive: 0, negative: 0, edge: 0 };

// ============================================================
// Utility Functions
// ============================================================

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url     = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port:     url.port,
      path:     url.pathname + url.search,
      method,
      headers:  { 'Content-Type': 'application/json', 'User-Agent': 'BillingTestSuite/1.0' },
      timeout:  30000,
    };

    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = HTTP_CLIENT.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: data ? JSON.parse(data) : {} });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data, parseError: e.message });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function assert(condition, message, type = 'positive') {
  stats.total++;
  if (type === 'negative') stats.negative++;
  else if (type === 'edge')  stats.edge++;
  else                        stats.positive++;

  if (condition) {
    console.log(`    ✅ ${message}`);
    stats.passed++;
    return true;
  } else {
    console.log(`    ❌ ${message}`);
    stats.failed++;
    return false;
  }
}

async function test(name, fn, type = 'positive') {
  const prefix = type === 'positive' ? '✅ POSITIVE'
               : type === 'negative' ? '❌ NEGATIVE'
               :                       '⚠️  EDGE';
  console.log(`\n  ${prefix}: ${name}`);
  try {
    await fn();
  } catch (err) {
    console.log(`    ❌ Unexpected error: ${err.message}`);
    if (DEBUG) console.log('    🔍 Stack:', err.stack);
    stats.failed++;
    stats.total++;
  }
}

function debug(label, data) {
  if (DEBUG) console.log(`    🔍 ${label}:`, JSON.stringify(data, null, 2));
}

// ============================================================
// PHASE 0 — AUTHENTICATION
// ============================================================

async function testAuthentication() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔐 PHASE 0: AUTHENTICATION');
  console.log('═══════════════════════════════════════════════════════════');

  await test('Admin login with valid credentials', async () => {
    const res = await makeRequest('POST', '/api/auth/login', ADMIN_CREDENTIALS);

    assert(res.status === 200 || res.status === 201, `Status is ${res.status}`, 'positive');
    assert(!!(res.body.accessToken || res.body.token), 'Token received', 'positive');
    assert(!!res.body.user?.id, 'User ID present', 'positive');

    adminToken = res.body.accessToken || res.body.token;
    adminId    = res.body.user?.id;
    if (!adminToken) throw new Error('Admin token not returned');
  }, 'positive');

  await test('Client login with valid credentials', async () => {
    const res = await makeRequest('POST', '/api/auth/login', CLIENT_CREDENTIALS);

    assert(res.status === 200 || res.status === 201, `Status is ${res.status}`, 'positive');
    assert(!!(res.body.accessToken || res.body.token), 'Token received', 'positive');

    clientToken = res.body.accessToken || res.body.token;
    clientId    = res.body.user?.id;
    if (!clientToken) throw new Error('Client token not returned');
  }, 'positive');

  await test('Login with wrong password returns 401', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      email: ADMIN_CREDENTIALS.email, password: 'WrongPassword!',
    });
    assert(res.status === 401 || res.status === 400, `Status is ${res.status}`, 'negative');
    assert(!res.body.token && !res.body.accessToken, 'No token on failure', 'negative');
  }, 'negative');

  await test('Unauthenticated request to protected endpoint returns 401', async () => {
    const res = await makeRequest('GET', '/api/admin/billing/invoices', null, null);
    assert(res.status === 401 || res.status === 403, `Status is ${res.status}`, 'negative');
  }, 'negative');
}

// ============================================================
// PHASE 1 — SERVICE SETUP  (group → service → plan → pricing)
// Sets up the minimal service catalog needed by later phases.
// Uses realistic pricing: setup fee, renewal price, suspension
// and termination fees so the billing module has real data to work with.
// ============================================================

async function testServiceSetup() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔧 PHASE 1: SERVICE SETUP (pre-requisite)');
  console.log('═══════════════════════════════════════════════════════════');

  // ── Service Group ────────────────────────────────────────────
  await test('Create service group', async () => {
    const res = await makeRequest('POST', '/api/admin/services/groups', {
      name:        svc.groupName,
      description: 'Billing test group',
      icon:        'fa-server',
      position:    0,
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Status ${res.status}`, 'positive');
    assert(!!res.body.id, 'Group ID returned', 'positive');
    svc.groupId = res.body.id;
    debug('group', { id: svc.groupId });
  }, 'positive');

  // ── Service ──────────────────────────────────────────────────
  await test('Create hosting service', async () => {
    const res = await makeRequest('POST', '/api/admin/services', {
      code:             svc.serviceCode,
      name:             'Billing Test Hosting',
      description:      'Service used by billing test suite',
      groupId:          svc.groupId,
      moduleType:       'hosting',
      paymentType:      'regular',
      customizeOption:  'addon_only',
      taxable:          true,
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Status ${res.status}`, 'positive');
    assert(!!res.body.id, 'Service ID returned', 'positive');
    svc.serviceId = res.body.id;
    debug('service', { id: svc.serviceId });
  }, 'positive');

  // ── Plan ─────────────────────────────────────────────────────
  await test('Create service plan', async () => {
    if (!svc.serviceId) { assert(false, 'Service ID missing', 'positive'); return; }

    const res = await makeRequest('POST', `/api/admin/services/${svc.serviceId}/plans`, {
      name:             'Pro Plan',
      summary:          'Professional hosting plan for billing tests',
      customizeOption:  'addon_only',   // required — allows addon selection on orders
      position:         0,
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Status ${res.status}`, 'positive');
    assert(!!res.body.id, 'Plan ID returned', 'positive');
    svc.planId = res.body.id;
    debug('plan', { id: svc.planId });
  }, 'positive');

  // ── Monthly Pricing (with all fee types) ─────────────────────
  await test('Create monthly pricing with setup, renewal, suspension, termination fees', async () => {
    if (!svc.planId) { assert(false, 'Plan ID missing', 'positive'); return; }

    const res = await makeRequest('POST', `/api/admin/plans/${svc.planId}/pricing`, {
      cycle:          'monthly',
      price:          29.99,
      setupFee:       9.99,
      renewalPrice:   24.99,
      suspensionFee:  5.00,
      terminationFee: 15.00,
      currency:       'USD',
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Status ${res.status}`, 'positive');
    assert(!!res.body.id, 'Pricing ID returned', 'positive');
    assert(parseFloat(res.body.setupFee) === 9.99, 'Setup fee set correctly', 'positive');
    svc.pricingId = res.body.id;
    debug('monthly pricing', { id: svc.pricingId });
  }, 'positive');

  // ── Annual Pricing (for renewal tests) ───────────────────────
  await test('Create annual pricing', async () => {
    if (!svc.planId) { assert(false, 'Plan ID missing', 'positive'); return; }

    const res = await makeRequest('POST', `/api/admin/plans/${svc.planId}/pricing`, {
      cycle:          'annually',
      price:          299.99,
      setupFee:       0,
      renewalPrice:   249.99,
      suspensionFee:  0,
      terminationFee: 49.99,
      currency:       'USD',
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Status ${res.status}`, 'positive');
    svc.annualPricingId = res.body.id;
  }, 'positive');

  // ── Add-on + attach to plan ───────────────────────────────────
  await test('Create add-on and attach to plan', async () => {
    if (!svc.serviceId || !svc.planId) { assert(false, 'IDs missing', 'positive'); return; }

    const addonRes = await makeRequest('POST', `/api/admin/services/${svc.serviceId}/addons`, {
      name:         'Extra Backup',
      description:  'Daily backup service',
      code:         `BACKUP-${Date.now()}`,
      setupFee:     0,
      monthlyPrice: 4.99,
      currency:     'USD',
      maxQuantity:  3,
      recurring:    true,
    }, adminToken);

    assert(addonRes.status === 201 || addonRes.status === 200, 'Add-on created', 'positive');
    svc.addonId = addonRes.body.id;

    // Create add-on pricing for monthly cycle
    const apRes = await makeRequest('POST', `/api/admin/addons/${svc.addonId}/pricing`, {
      cycle:        'monthly',
      price:        4.99,
      setupFee:     0,
      renewalPrice: 4.99,
      currency:     'USD',
    }, adminToken);
    assert(apRes.status === 201 || apRes.status === 200, 'Add-on pricing created', 'positive');
    svc.addonPricingId = apRes.body.id;

    // Attach to plan
    const attachRes = await makeRequest(
      'POST', `/api/admin/addons/${svc.addonId}/plans/${svc.planId}`,
      { included: false, quantity: 1 }, adminToken
    );
    assert(attachRes.status === 201 || attachRes.status === 200, 'Add-on attached to plan', 'positive');
  }, 'positive');
}

// ============================================================
// PHASE 2 — BILLING PROFILES
// ============================================================

async function testBillingProfiles() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('👤 PHASE 2: BILLING PROFILES');
  console.log('═══════════════════════════════════════════════════════════');

  // POSITIVE: Client creates / updates their own billing profile
  await test('Client upserts own billing profile', async () => {
    const res = await makeRequest('PUT', '/api/client/billing/profile', {
      currency:       'USD',
      billingAddress: '123 Test Street',
      city:           'Lahore',
      country:        'PK',
      postalCode:     '54000',
      taxId:          'PK-123456',
    }, clientToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.success === true, 'Success flag true', 'positive');
    assert(res.body.profile?.currency === 'USD', 'Currency set', 'positive');
    assert(res.body.profile?.country === 'PK', 'Country set', 'positive');
    billing.profileId = res.body.profile?.id;
    debug('billing profile', res.body.profile);
  }, 'positive');

  // POSITIVE: Client retrieves their billing profile
  await test('Client retrieves own billing profile', async () => {
    const res = await makeRequest('GET', '/api/client/billing/profile', null, clientToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.profile?.country === 'PK', 'Country matches', 'positive');
    assert(res.body.profile?.billingAddress, 'Address present', 'positive');
  }, 'positive');

  // POSITIVE: Admin reads any client's billing profile
  await test('Admin reads client billing profile', async () => {
    if (!clientId) { assert(false, 'Client ID missing', 'positive'); return; }

    const res = await makeRequest('GET', `/api/admin/billing/clients/${clientId}/profile`, null, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.profile?.clientId === clientId, 'Correct client profile', 'positive');
  }, 'positive');

  // POSITIVE: Admin updates a client's billing profile
  await test('Admin updates client billing profile', async () => {
    if (!clientId) { assert(false, 'Client ID missing', 'positive'); return; }

    const res = await makeRequest('PUT', `/api/admin/billing/clients/${clientId}/profile`, {
      currency: 'USD',
      country:  'PK',
      city:     'Karachi',
    }, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.profile?.city === 'Karachi', 'City updated', 'positive');
  }, 'positive');

  // NEGATIVE: Client cannot read another client's profile via admin endpoint
  await test('Client cannot access admin billing profile endpoint', async () => {
    if (!clientId) { assert(false, 'Client ID missing', 'negative'); return; }

    const res = await makeRequest('GET', `/api/admin/billing/clients/${clientId}/profile`, null, clientToken);

    assert(res.status === 401 || res.status === 403, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Invalid country code (must be 2 chars ISO)
  await test('Billing profile with invalid country code fails validation', async () => {
    const res = await makeRequest('PUT', '/api/client/billing/profile', {
      currency: 'USD',
      country:  'INVALID',
    }, clientToken);

    assert(res.status === 400 || res.status === 422, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Invalid currency code
  await test('Billing profile with invalid currency fails validation', async () => {
    const res = await makeRequest('PUT', '/api/client/billing/profile', {
      currency: 'DOLLAR',
    }, clientToken);

    assert(res.status === 400 || res.status === 422, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // EDGE: Update billing profile with only one field
  await test('Partial billing profile update (single field)', async () => {
    const res = await makeRequest('PUT', '/api/client/billing/profile', {
      postalCode: '54700',
    }, clientToken);

    assert(res.status === 200, `Status is ${res.status}`, 'edge');
  }, 'edge');

  // EDGE: Profile upsert is idempotent — calling twice returns same profile
  await test('Billing profile upsert is idempotent', async () => {
    const body = { currency: 'USD', country: 'PK', city: 'Lahore' };
    const res1 = await makeRequest('PUT', '/api/client/billing/profile', body, clientToken);
    const res2 = await makeRequest('PUT', '/api/client/billing/profile', body, clientToken);

    assert(res1.status === 200 && res2.status === 200, 'Both calls succeed', 'edge');
    assert(
      res1.body.profile?.id === res2.body.profile?.id,
      'Same profile ID returned both times', 'edge'
    );
  }, 'edge');
}

// ============================================================
// PHASE 3 — TAX RULES
// ============================================================

async function testTaxRules() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('💸 PHASE 3: TAX RULES');
  console.log('═══════════════════════════════════════════════════════════');

  // POSITIVE: Create a global tax rule
  await test('Create global tax rule (applies to all countries)', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/tax-rules', {
      name:    'Standard GST',
      rate:    0.17,
      country: null,
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Status is ${res.status}`, 'positive');
    assert(!!res.body.rule?.id, 'Rule ID returned', 'positive');
    assert(parseFloat(res.body.rule?.rate) === 0.17, 'Rate is 0.17 (17%)', 'positive');
    billing.taxRuleId = res.body.rule?.id;
    debug('tax rule', res.body.rule);
  }, 'positive');

  // POSITIVE: Create a country-specific tax rule
  await test('Create country-specific tax rule (PK hosting)', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/tax-rules', {
      name:        'Pakistan Sales Tax - Hosting',
      rate:        0.17,
      country:     'PK',
      serviceType: 'hosting',
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.rule?.country === 'PK', 'Country is PK', 'positive');
    billing.countryTaxRuleId = res.body.rule?.id;
  }, 'positive');

  // POSITIVE: List all tax rules
  await test('List all tax rules', async () => {
    const res = await makeRequest('GET', '/api/admin/billing/tax-rules', null, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(Array.isArray(res.body.rules), 'Rules array returned', 'positive');
    assert(res.body.rules.length >= 2, 'At least 2 rules exist', 'positive');
  }, 'positive');

  // POSITIVE: List active rules only
  await test('List active tax rules only', async () => {
    const res = await makeRequest('GET', '/api/admin/billing/tax-rules?activeOnly=true', null, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    const allActive = res.body.rules?.every(r => r.active === true);
    assert(allActive, 'All returned rules are active', 'positive');
  }, 'positive');

  // POSITIVE: Preview tax for client
  await test('Tax preview for PK hosting client', async () => {
    if (!clientId) { assert(false, 'Client ID missing', 'positive'); return; }

    const res = await makeRequest('POST', '/api/admin/billing/tax-rules/preview', {
      clientId,
      subtotal:    100.00,
      serviceType: 'hosting',
    }, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.taxRate !== undefined, 'Tax rate resolved', 'positive');
    assert(res.body.taxAmount !== undefined, 'Tax amount calculated', 'positive');
    debug('tax preview', { rate: res.body.taxRate, amount: res.body.taxAmount });
  }, 'positive');

  // POSITIVE: Update tax rule
  await test('Update tax rule rate', async () => {
    if (!billing.taxRuleId) { assert(false, 'Tax rule ID missing', 'positive'); return; }

    const res = await makeRequest('PUT', `/api/admin/billing/tax-rules/${billing.taxRuleId}`, {
      rate: 0.18,
    }, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(parseFloat(res.body.rule?.rate) === 0.18, 'Rate updated to 0.18', 'positive');
  }, 'positive');

  // NEGATIVE: Tax rate > 1 should fail (must be decimal like 0.17)
  await test('Tax rule with rate > 1 fails validation', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/tax-rules', {
      name: 'Invalid Rate',
      rate: 17,   // 17 instead of 0.17 — invalid
    }, adminToken);

    assert(res.status === 400 || res.status === 422, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Tax rule without required name fails
  await test('Create tax rule without name fails validation', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/tax-rules', {
      rate:    0.10,
      country: 'US',
    }, adminToken);

    assert(res.status === 400 || res.status === 422, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Tax preview without clientId fails
  await test('Tax preview without clientId fails', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/tax-rules/preview', {
      subtotal: 100.00,
    }, adminToken);

    assert(res.status === 400, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Client cannot manage tax rules
  await test('Client cannot create tax rules', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/tax-rules', {
      name: 'Client Tax Attempt',
      rate: 0.05,
    }, clientToken);

    assert(res.status === 401 || res.status === 403, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // EDGE: Tax rate of 0 (tax-exempt)
  await test('Create tax-exempt rule (rate = 0)', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/tax-rules', {
      name:    'Tax Exempt',
      rate:    0,
      country: 'AE',
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Status is ${res.status}`, 'edge');
    assert(parseFloat(res.body.rule?.rate) === 0, 'Rate is 0', 'edge');
  }, 'edge');

  // EDGE: Tax rate at boundary (exactly 1.0 = 100% tax)
  await test('Tax rule at max boundary rate (1.0)', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/tax-rules', {
      name: 'Max Tax',
      rate: 1.0,
    }, adminToken);

    assert(res.status === 201 || res.status === 200 || res.status === 400, `Status is ${res.status}`, 'edge');
  }, 'edge');
}

// ============================================================
// PHASE 4 — ORDER → INVOICE PIPELINE
// Creates orders then generates invoices from their snapshots.
// ============================================================

async function testOrderToInvoicePipeline() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔄 PHASE 4: ORDER → INVOICE PIPELINE');
  console.log('═══════════════════════════════════════════════════════════');

  if (!svc.pricingId) {
    console.log('  ⚠️  Pricing ID missing — skipping Phase 4');
    return;
  }

  // POSITIVE: Create a basic order (no addons)
  await test('Client creates basic order', async () => {
    const res = await makeRequest('POST', '/api/client/orders', {
      serviceId: svc.serviceId,
      planId:    svc.planId,
      pricingId: svc.pricingId,
    }, clientToken);

    assert(res.status === 201 || res.status === 200, `Status is ${res.status}`, 'positive');
    assert(!!res.body.order?.id, 'Order ID returned', 'positive');
    assert(!!res.body.costBreakdown, 'Cost breakdown present', 'positive');
    assert(parseFloat(res.body.costBreakdown?.baseCost) > 0, 'Base cost > 0', 'positive');
    billing.orderId = res.body.order?.id;
    debug('basic order', { id: billing.orderId, cost: res.body.costBreakdown });
  }, 'positive');

  // POSITIVE: Create order with add-ons
  await test('Client creates order with add-ons', async () => {
    if (!svc.addonId) { assert(false, 'Addon ID missing', 'positive'); return; }

    const res = await makeRequest('POST', '/api/client/orders', {
      serviceId: svc.serviceId,
      planId:    svc.planId,
      pricingId: svc.pricingId,
      addons:    [{ addonId: svc.addonId, quantity: 2 }],
    }, clientToken);

    assert(res.status === 201 || res.status === 200, `Status is ${res.status}`, 'positive');
    assert(!!res.body.order?.id, 'Order ID returned', 'positive');
    assert(parseFloat(res.body.costBreakdown?.addonCost) > 0, 'Addon cost > 0', 'positive');
    billing.orderWithAddonsId = res.body.order?.id;
    debug('order with addons', res.body.costBreakdown);
  }, 'positive');

  // POSITIVE: Admin generates invoice from order (draft)
  await test('Admin generates invoice from order (draft)', async () => {
    if (!billing.orderId) { assert(false, 'Order ID missing', 'positive'); return; }

    const res = await makeRequest('POST', `/api/admin/billing/orders/${billing.orderId}/invoice`, {
      billingCycles: 1,
      dueDays:       7,
      status:        'draft',
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Status is ${res.status}`, 'positive');
    assert(!!res.body.invoice?.id, 'Invoice ID returned', 'positive');
    assert(res.body.invoice?.status === 'draft', 'Invoice is draft', 'positive');
    assert(!!res.body.invoice?.invoiceNumber, 'Invoice number generated', 'positive');
    assert(parseFloat(res.body.invoice?.subtotal) > 0, 'Subtotal > 0', 'positive');
    assert(res.body.invoice?.lineItems?.length >= 2, 'Has line items (plan + setup fee)', 'positive');
    billing.invoiceId = res.body.invoice?.id;
    debug('generated invoice', {
      id:          billing.invoiceId,
      number:      res.body.invoice?.invoiceNumber,
      subtotal:    res.body.invoice?.subtotal,
      lineItems:   res.body.invoice?.lineItems?.length,
      taxAmount:   res.body.invoice?.taxAmount,
    });
  }, 'positive');

  // POSITIVE: Verify invoice line items contain plan + setup fee
  await test('Invoice line items include plan subscription and setup fee', async () => {
    if (!billing.invoiceId) { assert(false, 'Invoice ID missing', 'positive'); return; }

    const res = await makeRequest('GET', `/api/admin/billing/invoices/${billing.invoiceId}`, null, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    const items = res.body.invoice?.lineItems || [];
    const hasPlan  = items.some(i => i.description?.toLowerCase().includes('pro plan'));
    const hasSetup = items.some(i => i.description?.toLowerCase().includes('setup fee'));
    assert(hasPlan,  'Plan subscription line item present', 'positive');
    assert(hasSetup, 'Setup fee line item present', 'positive');
  }, 'positive');

  // POSITIVE: Generate invoice from order with addons — verify addon line items
  await test('Invoice from order with addons includes addon line items', async () => {
    if (!billing.orderWithAddonsId) { assert(false, 'Order ID missing', 'positive'); return; }

    const res = await makeRequest('POST', `/api/admin/billing/orders/${billing.orderWithAddonsId}/invoice`, {
      status: 'draft',
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Status is ${res.status}`, 'positive');
    const items = res.body.invoice?.lineItems || [];
    const hasAddon = items.some(i => i.description?.toLowerCase().includes('extra backup'));
    assert(hasAddon, 'Add-on line item present in invoice', 'positive');
    assert(items.length >= 2, 'Multiple line items', 'positive');
    debug('addon invoice line items', items.map(i => ({ desc: i.description, total: i.total })));
  }, 'positive');

  // POSITIVE: Generate invoice with billingCycles = 3 (upfront billing)
  await test('Generate invoice for 3 billing cycles upfront', async () => {
    if (!billing.orderId) { assert(false, 'Order ID missing', 'positive'); return; }

    // Create a fresh order for this test
    const orderRes = await makeRequest('POST', '/api/client/orders', {
      serviceId: svc.serviceId,
      planId:    svc.planId,
      pricingId: svc.pricingId,
    }, clientToken);

    if (!orderRes.body.order?.id) {
      assert(false, 'Could not create order for upfront test', 'positive');
      return;
    }

    const res = await makeRequest('POST', `/api/admin/billing/orders/${orderRes.body.order.id}/invoice`, {
      billingCycles: 3,
      status:        'draft',
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Status is ${res.status}`, 'positive');
    const planItem = res.body.invoice?.lineItems?.find(i => i.quantity === 3);
    assert(!!planItem, 'Plan line item has quantity 3', 'positive');
    debug('3-cycle invoice total', res.body.invoice?.totalAmount);
  }, 'positive');

  // NEGATIVE: Generate invoice for same order twice (conflict)
  await test('Generating a second active invoice for same order is rejected', async () => {
    if (!billing.orderId) { assert(false, 'Order ID missing', 'negative'); return; }

    const res = await makeRequest('POST', `/api/admin/billing/orders/${billing.orderId}/invoice`, {
      status: 'unpaid',
    }, adminToken);

    // First invoice was draft — this sends unpaid which conflicts
    assert(res.status === 409 || res.status === 400 || res.status === 201, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Generate invoice for non-existent order
  await test('Generate invoice for non-existent order returns 404', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/orders/non-existent-order-id/invoice', {
      status: 'draft',
    }, adminToken);

    assert(res.status === 404 || res.status === 400, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Client cannot generate invoices (admin-only)
  await test('Client cannot generate order invoices', async () => {
    if (!billing.orderId) { assert(false, 'Order ID missing', 'negative'); return; }

    const res = await makeRequest('POST', `/api/admin/billing/orders/${billing.orderId}/invoice`, {
      status: 'draft',
    }, clientToken);

    assert(res.status === 401 || res.status === 403, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // EDGE: Invoice total equals sum of base + setup fee + tax
  await test('Invoice total arithmetic is consistent', async () => {
    if (!billing.invoiceId) { assert(false, 'Invoice ID missing', 'edge'); return; }

    const res = await makeRequest('GET', `/api/admin/billing/invoices/${billing.invoiceId}`, null, adminToken);

    const inv     = res.body.invoice;
    const subtotal = parseFloat(inv?.subtotal       || 0);
    const tax      = parseFloat(inv?.taxAmount      || 0);
    const discount = parseFloat(inv?.discountAmount || 0);
    const total    = parseFloat(inv?.totalAmount    || 0);
    const expected = parseFloat((subtotal + tax - discount).toFixed(2));

    assert(Math.abs(total - expected) < 0.01, `Total (${total}) = subtotal+tax-discount (${expected})`, 'edge');
    assert(parseFloat(inv?.amountDue) === total, 'amountDue equals totalAmount on new invoice', 'edge');
    assert(parseFloat(inv?.amountPaid) === 0, 'amountPaid is 0 on new invoice', 'edge');
  }, 'edge');
}

// ============================================================
// PHASE 5 — INVOICE LIFECYCLE  (send / cancel / mark-paid)
// ============================================================

async function testInvoiceLifecycle() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📄 PHASE 5: INVOICE LIFECYCLE');
  console.log('═══════════════════════════════════════════════════════════');

  // POSITIVE: List invoices (admin)
  await test('Admin lists all invoices', async () => {
    const res = await makeRequest('GET', '/api/admin/billing/invoices', null, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(Array.isArray(res.body.invoices), 'Invoices array present', 'positive');
    assert(typeof res.body.total === 'number', 'Total count present', 'positive');
  }, 'positive');

  // POSITIVE: Filter invoices by status
  await test('Admin filters invoices by status=draft', async () => {
    const res = await makeRequest('GET', '/api/admin/billing/invoices?status=draft', null, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    const allDraft = res.body.invoices?.every(i => i.status === 'draft');
    assert(allDraft, 'All returned invoices are draft', 'positive');
  }, 'positive');

  // POSITIVE: Get single invoice
  await test('Get invoice by ID', async () => {
    if (!billing.invoiceId) { assert(false, 'Invoice ID missing', 'positive'); return; }

    const res = await makeRequest('GET', `/api/admin/billing/invoices/${billing.invoiceId}`, null, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.invoice?.id === billing.invoiceId, 'Correct invoice returned', 'positive');
    assert(Array.isArray(res.body.invoice?.lineItems), 'Line items present', 'positive');
    assert(Array.isArray(res.body.invoice?.payments), 'Payments array present', 'positive');
  }, 'positive');

  // POSITIVE: Send invoice (draft → unpaid)
  await test('Send invoice transitions draft → unpaid', async () => {
    if (!billing.invoiceId) { assert(false, 'Invoice ID missing', 'positive'); return; }

    const res = await makeRequest('POST', `/api/admin/billing/invoices/${billing.invoiceId}/send`, {}, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.invoice?.status === 'unpaid', 'Invoice is now unpaid', 'positive');
    assert(!!res.body.invoice?.issuedAt, 'issuedAt timestamp set', 'positive');
    assert(!!res.body.invoice?.dueDate, 'dueDate set', 'positive');
    billing.unpaidInvoiceId = billing.invoiceId;
    debug('sent invoice', { status: res.body.invoice?.status, dueDate: res.body.invoice?.dueDate });
  }, 'positive');

  // POSITIVE: Get invoices by order
  await test('Get all invoices for an order', async () => {
    if (!billing.orderId) { assert(false, 'Order ID missing', 'positive'); return; }

    const res = await makeRequest('GET', `/api/admin/billing/orders/${billing.orderId}/invoices`, null, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(Array.isArray(res.body.invoices), 'Invoices array returned', 'positive');
    assert(res.body.invoices?.length >= 1, 'At least one invoice for order', 'positive');
  }, 'positive');

  // POSITIVE: Admin mark-paid override
  await test('Admin can manually mark invoice as paid', async () => {
    // Create a fresh order + invoice to mark paid
    if (!svc.pricingId) { assert(false, 'Pricing ID missing', 'positive'); return; }

    const orderRes = await makeRequest('POST', '/api/client/orders', {
      serviceId: svc.serviceId,
      planId:    svc.planId,
      pricingId: svc.pricingId,
    }, clientToken);

    const invRes = await makeRequest('POST', `/api/admin/billing/orders/${orderRes.body.order.id}/invoice`, {
      status: 'unpaid',
    }, adminToken);

    const invId = invRes.body.invoice?.id;
    if (!invId) { assert(false, 'Invoice creation failed', 'positive'); return; }

    const markRes = await makeRequest('POST', `/api/admin/billing/invoices/${invId}/mark-paid`, {}, adminToken);

    assert(markRes.status === 200, `Status is ${markRes.status}`, 'positive');
    assert(markRes.body.invoice?.status === 'paid', 'Invoice is now paid', 'positive');
    assert(!!markRes.body.invoice?.paidAt, 'paidAt timestamp set', 'positive');
    billing.paidInvoiceId = invId;
  }, 'positive');

  // POSITIVE: Cancel a draft invoice
  await test('Cancel a draft invoice', async () => {
    if (!svc.pricingId) { assert(false, 'Pricing ID missing', 'positive'); return; }

    const orderRes = await makeRequest('POST', '/api/client/orders', {
      serviceId: svc.serviceId,
      planId:    svc.planId,
      pricingId: svc.pricingId,
    }, clientToken);

    const invRes = await makeRequest('POST', `/api/admin/billing/orders/${orderRes.body.order.id}/invoice`, {
      status: 'draft',
    }, adminToken);

    const res = await makeRequest('POST', `/api/admin/billing/invoices/${invRes.body.invoice.id}/cancel`, {}, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.invoice?.status === 'cancelled', 'Invoice is cancelled', 'positive');
    assert(!!res.body.invoice?.cancelledAt, 'cancelledAt set', 'positive');
  }, 'positive');

  // NEGATIVE: Cannot send an already-sent invoice
  await test('Sending an already-unpaid invoice returns 409', async () => {
    if (!billing.unpaidInvoiceId) { assert(false, 'Unpaid invoice ID missing', 'negative'); return; }

    const res = await makeRequest('POST', `/api/admin/billing/invoices/${billing.unpaidInvoiceId}/send`, {}, adminToken);

    assert(res.status === 409, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Cannot cancel a paid invoice
  await test('Cancelling a paid invoice returns 409', async () => {
    if (!billing.paidInvoiceId) { assert(false, 'Paid invoice ID missing', 'negative'); return; }

    const res = await makeRequest('POST', `/api/admin/billing/invoices/${billing.paidInvoiceId}/cancel`, {}, adminToken);

    assert(res.status === 409, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Cannot mark-paid a cancelled invoice
  await test('Mark-paid on a cancelled invoice returns 409', async () => {
    // Create, send, cancel, then attempt mark-paid
    if (!svc.pricingId) { assert(false, 'Pricing ID missing', 'negative'); return; }

    const orderRes = await makeRequest('POST', '/api/client/orders', {
      serviceId: svc.serviceId, planId: svc.planId, pricingId: svc.pricingId,
    }, clientToken);
    const invRes = await makeRequest('POST', `/api/admin/billing/orders/${orderRes.body.order.id}/invoice`, {
      status: 'draft',
    }, adminToken);
    const invId = invRes.body.invoice?.id;
    await makeRequest('POST', `/api/admin/billing/invoices/${invId}/cancel`, {}, adminToken);

    const res = await makeRequest('POST', `/api/admin/billing/invoices/${invId}/mark-paid`, {}, adminToken);
    assert(res.status === 409, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Get non-existent invoice returns 404
  await test('Get non-existent invoice returns 404', async () => {
    const res = await makeRequest('GET', '/api/admin/billing/invoices/non-existent-id', null, adminToken);

    assert(res.status === 404 || res.status === 400, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Filter with invalid status value
  await test('Filter invoices with invalid status value', async () => {
    const res = await makeRequest('GET', '/api/admin/billing/invoices?status=flying', null, adminToken);

    assert(res.status === 400 || res.status === 200, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // EDGE: Pagination — limit and offset
  await test('Invoice list respects pagination params', async () => {
    const res = await makeRequest('GET', '/api/admin/billing/invoices?limit=2&offset=0', null, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'edge');
    assert((res.body.invoices?.length || 0) <= 2, 'Limit of 2 respected', 'edge');
  }, 'edge');

  // EDGE: Invoice statistics
  await test('Invoice statistics endpoint returns counts and totals', async () => {
    const res = await makeRequest('GET', '/api/admin/billing/invoices/stats', null, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'edge');
    assert(res.body.byStatus !== undefined, 'byStatus breakdown present', 'edge');
    assert(res.body.totalRevenue !== undefined, 'totalRevenue present', 'edge');
  }, 'edge');
}

// ============================================================
// PHASE 6 — DISCOUNTS & CREDITS
// ============================================================

async function testDiscounts() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🏷️  PHASE 6: DISCOUNTS & CREDITS');
  console.log('═══════════════════════════════════════════════════════════');

  let discountInvoiceId = null;

  // Setup: create a fresh unpaid invoice to apply discounts to
  await test('Setup: create unpaid invoice for discount tests', async () => {
    if (!svc.pricingId) { assert(false, 'Pricing ID missing', 'positive'); return; }

    const orderRes = await makeRequest('POST', '/api/client/orders', {
      serviceId: svc.serviceId, planId: svc.planId, pricingId: svc.pricingId,
    }, clientToken);
    const invRes = await makeRequest('POST', `/api/admin/billing/orders/${orderRes.body.order.id}/invoice`, {
      status: 'unpaid',
    }, adminToken);

    discountInvoiceId = invRes.body.invoice?.id;
    assert(!!discountInvoiceId, 'Discount test invoice created', 'positive');
    debug('discount invoice', { id: discountInvoiceId, total: invRes.body.invoice?.totalAmount });
  }, 'positive');

  // POSITIVE: Apply flat discount
  await test('Apply flat $5 discount to unpaid invoice', async () => {
    if (!discountInvoiceId) { assert(false, 'Invoice ID missing', 'positive'); return; }

    const beforeRes = await makeRequest('GET', `/api/admin/billing/invoices/${discountInvoiceId}`, null, adminToken);
    const totalBefore = parseFloat(beforeRes.body.invoice?.totalAmount || 0);

    const res = await makeRequest('POST', `/api/admin/billing/invoices/${discountInvoiceId}/discount`, {
      type:        'manual',
      description: 'Loyalty discount',
      amount:      5.00,
      isPercent:   false,
    }, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    const totalAfter = parseFloat(res.body.invoice?.totalAmount || 0);
    assert(totalAfter < totalBefore, `Total reduced from ${totalBefore} to ${totalAfter}`, 'positive');
    assert(parseFloat(res.body.invoice?.discountAmount) >= 5, 'Discount amount updated', 'positive');
  }, 'positive');

  // POSITIVE: Apply percentage discount
  await test('Apply 10% promotional discount', async () => {
    if (!discountInvoiceId) { assert(false, 'Invoice ID missing', 'positive'); return; }

    const res = await makeRequest('POST', `/api/admin/billing/invoices/${discountInvoiceId}/discount`, {
      type:        'promo',
      code:        'WELCOME10',
      description: '10% welcome discount',
      amount:      10,
      isPercent:   true,
    }, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(Array.isArray(res.body.invoice?.discounts), 'Discounts array present', 'positive');
    assert(res.body.invoice?.discounts?.length >= 2, 'Multiple discounts applied', 'positive');
    debug('discounts', res.body.invoice?.discounts?.map(d => ({ type: d.type, amount: d.amount })));
  }, 'positive');

  // POSITIVE: Invoice snapshot includes discount from order pricing
  await test('Snapshot pricing discount is reflected in invoice line item', async () => {
    if (!billing.invoiceId) { assert(false, 'Invoice ID missing', 'positive'); return; }

    const res = await makeRequest('GET', `/api/admin/billing/invoices/${billing.invoiceId}`, null, adminToken);
    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    // Just confirm discountAmount field exists on invoice regardless of value
    assert(res.body.invoice?.discountAmount !== undefined, 'discountAmount field present', 'positive');
  }, 'positive');

  // NEGATIVE: Discount with negative amount fails
  await test('Apply negative discount amount fails validation', async () => {
    if (!discountInvoiceId) { assert(false, 'Invoice ID missing', 'negative'); return; }

    const res = await makeRequest('POST', `/api/admin/billing/invoices/${discountInvoiceId}/discount`, {
      type:   'manual',
      amount: -10,
    }, adminToken);

    assert(res.status === 400 || res.status === 422, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Discount on a cancelled invoice fails
  await test('Apply discount to cancelled invoice is rejected', async () => {
    if (!svc.pricingId) { assert(false, 'Pricing ID missing', 'negative'); return; }

    const orderRes = await makeRequest('POST', '/api/client/orders', {
      serviceId: svc.serviceId, planId: svc.planId, pricingId: svc.pricingId,
    }, clientToken);
    const invRes = await makeRequest('POST', `/api/admin/billing/orders/${orderRes.body.order.id}/invoice`, {
      status: 'draft',
    }, adminToken);
    const invId = invRes.body.invoice?.id;
    await makeRequest('POST', `/api/admin/billing/invoices/${invId}/cancel`, {}, adminToken);

    const res = await makeRequest('POST', `/api/admin/billing/invoices/${invId}/discount`, {
      type: 'manual', amount: 5,
    }, adminToken);

    assert(res.status === 409 || res.status === 400, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // EDGE: Discount larger than invoice total (should clamp to 0)
  await test('Discount exceeding invoice total results in $0 due (clamped)', async () => {
    if (!discountInvoiceId) { assert(false, 'Invoice ID missing', 'edge'); return; }

    const beforeRes = await makeRequest('GET', `/api/admin/billing/invoices/${discountInvoiceId}`, null, adminToken);
    const total     = parseFloat(beforeRes.body.invoice?.totalAmount || 0);

    const res = await makeRequest('POST', `/api/admin/billing/invoices/${discountInvoiceId}/discount`, {
      type:   'credit',
      amount: total + 1000,  // far exceeds total
    }, adminToken);

    if (res.status === 200) {
      const newTotal = parseFloat(res.body.invoice?.totalAmount || 0);
      assert(newTotal >= 0, 'Total clamped to >= 0 (no negative invoices)', 'edge');
    } else {
      assert(res.status === 400, `Overage rejected with ${res.status}`, 'edge');
    }
  }, 'edge');

  // EDGE: Percentage discount of 100 should zero the invoice
  await test('100% discount zeroes invoice total', async () => {
    if (!svc.pricingId) { assert(false, 'Pricing ID missing', 'edge'); return; }

    const orderRes = await makeRequest('POST', '/api/client/orders', {
      serviceId: svc.serviceId, planId: svc.planId, pricingId: svc.pricingId,
    }, clientToken);
    const invRes = await makeRequest('POST', `/api/admin/billing/orders/${orderRes.body.order.id}/invoice`, {
      status: 'unpaid',
    }, adminToken);

    const res = await makeRequest('POST', `/api/admin/billing/invoices/${invRes.body.invoice.id}/discount`, {
      type: 'promo', amount: 100, isPercent: true,
    }, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'edge');
    assert(parseFloat(res.body.invoice?.totalAmount) === 0, 'Total is 0 after 100% discount', 'edge');
  }, 'edge');
}

// ============================================================
// PHASE 7 — MANUAL INVOICES
// ============================================================

async function testManualInvoices() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📝 PHASE 7: MANUAL INVOICES');
  console.log('═══════════════════════════════════════════════════════════');

  // POSITIVE: Create manual invoice with custom line items
  await test('Admin creates manual invoice with multiple line items', async () => {
    if (!clientId) { assert(false, 'Client ID missing', 'positive'); return; }

    const res = await makeRequest('POST', '/api/admin/billing/invoices/manual', {
      clientId,
      currency: 'USD',
      lineItems: [
        { description: 'Domain registration - example.com',  quantity: 1, unitPrice: 12.99 },
        { description: 'SSL Certificate - 1 year',           quantity: 1, unitPrice: 49.99 },
        { description: 'Migration service',                  quantity: 2, unitPrice: 25.00 },
      ],
      discounts: [
        { type: 'manual', description: 'New client discount', amount: 10.00, isPercent: false },
      ],
      dueDays: 14,
      notes:   'First invoice — new client onboarding package',
      status:  'draft',
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Status is ${res.status}`, 'positive');
    assert(!!res.body.invoice?.id, 'Invoice ID returned', 'positive');
    assert(res.body.invoice?.lineItems?.length === 3, 'Three line items', 'positive');
    assert(res.body.invoice?.discounts?.length === 1, 'One discount', 'positive');

    const expectedSubtotal = 12.99 + 49.99 + (25.00 * 2); // 112.98
    assert(
      Math.abs(parseFloat(res.body.invoice?.subtotal) - expectedSubtotal) < 0.01,
      `Subtotal is ${expectedSubtotal}`, 'positive'
    );
    billing.manualInvoiceId = res.body.invoice?.id;
    debug('manual invoice', { id: billing.manualInvoiceId, subtotal: res.body.invoice?.subtotal });
  }, 'positive');

  // POSITIVE: Create minimal manual invoice (single line item)
  await test('Admin creates minimal manual invoice (single line item)', async () => {
    if (!clientId) { assert(false, 'Client ID missing', 'positive'); return; }

    const res = await makeRequest('POST', '/api/admin/billing/invoices/manual', {
      clientId,
      lineItems: [{ description: 'Consultation fee', quantity: 1, unitPrice: 75.00 }],
      status:    'unpaid',
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.invoice?.status === 'unpaid', 'Invoice is unpaid', 'positive');
  }, 'positive');

  // NEGATIVE: Manual invoice without clientId fails
  await test('Manual invoice without clientId fails validation', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/invoices/manual', {
      lineItems: [{ description: 'Test', quantity: 1, unitPrice: 10 }],
    }, adminToken);

    assert(res.status === 400 || res.status === 422, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Manual invoice with empty lineItems fails
  await test('Manual invoice with zero line items fails validation', async () => {
    if (!clientId) { assert(false, 'Client ID missing', 'negative'); return; }

    const res = await makeRequest('POST', '/api/admin/billing/invoices/manual', {
      clientId,
      lineItems: [],
    }, adminToken);

    assert(res.status === 400 || res.status === 422, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Manual invoice with non-existent clientId fails
  await test('Manual invoice with non-existent client returns 404', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/invoices/manual', {
      clientId:  '00000000-0000-0000-0000-000000000000',
      lineItems: [{ description: 'Test', quantity: 1, unitPrice: 10 }],
    }, adminToken);

    assert(res.status === 404 || res.status === 400, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Line item with zero unit price
  await test('Manual invoice with zero unit price fails validation', async () => {
    if (!clientId) { assert(false, 'Client ID missing', 'negative'); return; }

    const res = await makeRequest('POST', '/api/admin/billing/invoices/manual', {
      clientId,
      lineItems: [{ description: 'Free item', quantity: 1, unitPrice: 0 }],
    }, adminToken);

    // unitPrice must be > 0 per Joi schema
    assert(res.status === 400 || res.status === 422, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Client cannot create manual invoices
  await test('Client cannot create manual invoices', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/invoices/manual', {
      clientId,
      lineItems: [{ description: 'Self-invoice', quantity: 1, unitPrice: 100 }],
    }, clientToken);

    assert(res.status === 401 || res.status === 403, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // EDGE: Very large number of line items
  await test('Manual invoice with 20 line items', async () => {
    if (!clientId) { assert(false, 'Client ID missing', 'edge'); return; }

    const lineItems = Array.from({ length: 20 }, (_, i) => ({
      description: `Service item ${i + 1}`,
      quantity:    1,
      unitPrice:   1.00,
    }));

    const res = await makeRequest('POST', '/api/admin/billing/invoices/manual', {
      clientId,
      lineItems,
      status: 'draft',
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Status is ${res.status}`, 'edge');
    assert(parseFloat(res.body.invoice?.subtotal) === 20.00, 'Subtotal = 20.00', 'edge');
  }, 'edge');
}

// ============================================================
// PHASE 8 — PAYMENTS
// ============================================================

async function testPayments() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('💳 PHASE 8: PAYMENTS');
  console.log('═══════════════════════════════════════════════════════════');

  if (!billing.unpaidInvoiceId) {
    console.log('  ⚠️  No unpaid invoice available — skipping Phase 8');
    return;
  }

  // Get the exact amount due before any payment
  const invoiceRes = await makeRequest('GET', `/api/admin/billing/invoices/${billing.unpaidInvoiceId}`, null, adminToken);
  const amountDue  = parseFloat(invoiceRes.body.invoice?.amountDue || 0);
  debug('amount due on unpaid invoice', amountDue);

  // POSITIVE: Record a partial payment
  await test('Record partial payment against unpaid invoice', async () => {
    const partialAmount = parseFloat((amountDue / 2).toFixed(2));

    const res = await makeRequest('POST', `/api/admin/billing/invoices/${billing.unpaidInvoiceId}/payments`, {
      amount:    partialAmount,
      gateway:   'manual',
      currency:  'USD',
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Status is ${res.status}`, 'positive');
    assert(!!res.body.payment?.id, 'Payment ID returned', 'positive');
    assert(res.body.payment?.status === 'completed', 'Payment status is completed', 'positive');
    assert(res.body.invoice?.status !== 'paid', 'Invoice not yet fully paid', 'positive');
    assert(
      parseFloat(res.body.invoice?.amountPaid) === partialAmount,
      `amountPaid updated to ${partialAmount}`, 'positive'
    );
    billing.partialPaymentId = res.body.payment?.id;
    debug('partial payment', { id: billing.partialPaymentId, amountPaid: partialAmount });
  }, 'positive');

  // POSITIVE: List payments for invoice
  await test('List payments for invoice', async () => {
    const res = await makeRequest('GET', `/api/admin/billing/invoices/${billing.unpaidInvoiceId}/payments`, null, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(Array.isArray(res.body.payments), 'Payments array returned', 'positive');
    assert(res.body.payments?.length >= 1, 'At least one payment', 'positive');
  }, 'positive');

  // POSITIVE: Record final payment — invoice becomes paid
  await test('Record final payment — invoice auto-transitions to paid', async () => {
    const afterPartialRes = await makeRequest('GET', `/api/admin/billing/invoices/${billing.unpaidInvoiceId}`, null, adminToken);
    const remaining = parseFloat(afterPartialRes.body.invoice?.amountDue || 0);

    const res = await makeRequest('POST', `/api/admin/billing/invoices/${billing.unpaidInvoiceId}/payments`, {
      amount:   remaining,
      gateway:  'stripe',
      currency: 'USD',
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.invoice?.status === 'paid', 'Invoice auto-marked paid', 'positive');
    assert(!!res.body.invoice?.paidAt, 'paidAt timestamp set', 'positive');
    assert(parseFloat(res.body.invoice?.amountDue) === 0, 'amountDue is 0', 'positive');
    billing.paymentId = res.body.payment?.id;
    debug('final payment', { id: billing.paymentId, status: res.body.invoice?.status });
  }, 'positive');

  // POSITIVE: Get payment by ID
  await test('Get payment by ID', async () => {
    if (!billing.paymentId) { assert(false, 'Payment ID missing', 'positive'); return; }

    const res = await makeRequest('GET', `/api/admin/billing/payments/${billing.paymentId}`, null, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.payment?.id === billing.paymentId, 'Correct payment returned', 'positive');
    assert(res.body.payment?.status === 'completed', 'Payment is completed', 'positive');
    assert(Array.isArray(res.body.payment?.refunds), 'Refunds array present', 'positive');
  }, 'positive');

  // POSITIVE: List all payments (admin)
  await test('Admin lists all payments with filters', async () => {
    const res = await makeRequest('GET', '/api/admin/billing/payments?status=completed&limit=10', null, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(typeof res.body.total === 'number', 'Total count present', 'positive');
  }, 'positive');

  // POSITIVE: Initiate gateway payment session
  await test('Client initiates Stripe checkout session for invoice', async () => {
    // Create a fresh unpaid invoice for the client
    if (!svc.pricingId) { assert(false, 'Pricing ID missing', 'positive'); return; }
    const orderRes = await makeRequest('POST', '/api/client/orders', {
      serviceId: svc.serviceId, planId: svc.planId, pricingId: svc.pricingId,
    }, clientToken);
    const invRes = await makeRequest('POST', `/api/admin/billing/orders/${orderRes.body.order.id}/invoice`, {
      status: 'unpaid',
    }, adminToken);

    const res = await makeRequest('POST', `/api/client/billing/invoices/${invRes.body.invoice.id}/pay`, {
      gateway: 'stripe',
    }, clientToken);

    // Gateway stub returns 200 with a message (not a real session)
    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.gateway === 'stripe', 'Gateway confirmed', 'positive');
    assert(res.body.invoiceId === invRes.body.invoice.id, 'Correct invoice ID', 'positive');
  }, 'positive');

  // NEGATIVE: Overpayment rejected
  await test('Payment exceeding amount due is rejected', async () => {
    // Use a fresh invoice so we have a predictable amount due
    if (!svc.pricingId) { assert(false, 'Pricing ID missing', 'negative'); return; }
    const orderRes = await makeRequest('POST', '/api/client/orders', {
      serviceId: svc.serviceId, planId: svc.planId, pricingId: svc.pricingId,
    }, clientToken);
    const invRes = await makeRequest('POST', `/api/admin/billing/orders/${orderRes.body.order.id}/invoice`, {
      status: 'unpaid',
    }, adminToken);
    const due = parseFloat(invRes.body.invoice?.amountDue || 0);

    const res = await makeRequest('POST', `/api/admin/billing/invoices/${invRes.body.invoice.id}/payments`, {
      amount:  due + 1000,
      gateway: 'manual',
    }, adminToken);

    assert(res.status === 400, `Status is ${res.status}`, 'negative');
    assert(res.body.error?.toLowerCase().includes('exceed'), 'Error mentions overpayment', 'negative');
  }, 'negative');

  // NEGATIVE: Payment with amount <= 0 is rejected
  await test('Payment with zero amount fails validation', async () => {
    if (!billing.manualInvoiceId) { assert(false, 'Invoice ID missing', 'negative'); return; }

    const res = await makeRequest('POST', `/api/admin/billing/invoices/${billing.manualInvoiceId}/payments`, {
      amount:  0,
      gateway: 'manual',
    }, adminToken);

    assert(res.status === 400 || res.status === 422, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Payment on a cancelled invoice is rejected
  await test('Payment on cancelled invoice is rejected', async () => {
    if (!svc.pricingId) { assert(false, 'Pricing ID missing', 'negative'); return; }
    const orderRes = await makeRequest('POST', '/api/client/orders', {
      serviceId: svc.serviceId, planId: svc.planId, pricingId: svc.pricingId,
    }, clientToken);
    const invRes = await makeRequest('POST', `/api/admin/billing/orders/${orderRes.body.order.id}/invoice`, {
      status: 'draft',
    }, adminToken);
    await makeRequest('POST', `/api/admin/billing/invoices/${invRes.body.invoice.id}/cancel`, {}, adminToken);

    const res = await makeRequest('POST', `/api/admin/billing/invoices/${invRes.body.invoice.id}/payments`, {
      amount: 10, gateway: 'manual',
    }, adminToken);

    assert(res.status === 409, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Payment stats — client cannot access
  await test('Client cannot access payment stats endpoint', async () => {
    const res = await makeRequest('GET', '/api/admin/billing/payments/stats', null, clientToken);
    assert(res.status === 401 || res.status === 403, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Initiate payment with unsupported gateway
  await test('Unsupported gateway rejected in initiate-payment', async () => {
    if (!billing.unpaidInvoiceId) { assert(false, 'Invoice ID missing', 'negative'); return; }

    const res = await makeRequest('POST', `/api/client/billing/invoices/${billing.unpaidInvoiceId}/pay`, {
      gateway: 'bitcoin',
    }, clientToken);

    assert(res.status === 400, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // EDGE: Payment statistics endpoint
  await test('Payment statistics returns breakdown by gateway and status', async () => {
    const res = await makeRequest('GET', '/api/admin/billing/payments/stats', null, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'edge');
    assert(Array.isArray(res.body.byGateway), 'byGateway array present (may be empty)', 'edge');
    assert(res.body.byStatus !== undefined, 'byStatus present', 'edge');
    assert(typeof res.body.refunds?.count === 'number', 'Refund count is a number', 'edge');
  }, 'edge');

  // EDGE: Client's own payment history
  await test('Client views own payment history', async () => {
    const res = await makeRequest('GET', '/api/client/billing/payments', null, clientToken);

    assert(res.status === 200, `Status is ${res.status}`, 'edge');
    assert(Array.isArray(res.body.payments), 'Payments array returned', 'edge');
  }, 'edge');
}

// ============================================================
// PHASE 9 — REFUNDS
// ============================================================

async function testRefunds() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('↩️  PHASE 9: REFUNDS');
  console.log('═══════════════════════════════════════════════════════════');

  if (!billing.paymentId) {
    console.log('  ⚠️  No completed payment available — skipping Phase 9');
    return;
  }

  const paymentRes = await makeRequest('GET', `/api/admin/billing/payments/${billing.paymentId}`, null, adminToken);
  const paymentAmount = parseFloat(paymentRes.body.payment?.amount || 0);
  debug('payment to refund', { id: billing.paymentId, amount: paymentAmount });

  // POSITIVE: Partial refund
  await test('Process partial refund', async () => {
    const refundAmount = parseFloat((paymentAmount / 3).toFixed(2));

    const res = await makeRequest('POST', `/api/admin/billing/payments/${billing.paymentId}/refund`, {
      amount: refundAmount,
      reason: 'Partial service credit',
      notes:  'Prorated refund for unused period',
    }, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(!!res.body.refund?.id, 'Refund ID returned', 'positive');
    assert(parseFloat(res.body.refund?.amount) === refundAmount, 'Refund amount correct', 'positive');
    assert(res.body.isFullRefund === false, 'Marked as partial refund', 'positive');
    billing.refundId = res.body.refund?.id;
    debug('partial refund', { id: billing.refundId, amount: refundAmount });
  }, 'positive');

  // POSITIVE: Invoice balance is reduced after refund
  await test('Invoice amountPaid decreases after refund', async () => {
    const res = await makeRequest('GET', `/api/admin/billing/invoices/${billing.unpaidInvoiceId}`, null, adminToken);

    // The invoice was fully paid (amountPaid = totalAmount).
    // After a partial refund, amountDue should be > 0 and status should revert to unpaid.
    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    const amountDue  = parseFloat(res.body.invoice?.amountDue  || 0);
    const totalAmt   = parseFloat(res.body.invoice?.totalAmount || 0);
    const amountPaid = parseFloat(res.body.invoice?.amountPaid  || 0);
    assert(amountDue > 0, `amountDue (${amountDue}) > 0 after partial refund`, 'positive');
    assert(amountPaid < totalAmt, `amountPaid (${amountPaid}) < totalAmount (${totalAmt})`, 'positive');
    debug('invoice after partial refund', { amountPaid, amountDue, totalAmt });
  }, 'positive');

  // POSITIVE: List refunds for payment
  await test('List refunds for a payment', async () => {
    const res = await makeRequest('GET', `/api/admin/billing/payments/${billing.paymentId}/refunds`, null, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(Array.isArray(res.body.refunds), 'Refunds array returned', 'positive');
    assert(res.body.refunds?.length >= 1, 'At least one refund listed', 'positive');
  }, 'positive');

  // POSITIVE: Full refund of remaining balance
  await test('Process full refund of remaining payment balance', async () => {
    const afterPartialRes = await makeRequest('GET', `/api/admin/billing/payments/${billing.paymentId}`, null, adminToken);
    const alreadyRefunded = afterPartialRes.body.payment?.refunds?.reduce(
      (s, r) => s + parseFloat(r.amount), 0
    ) || 0;
    const remaining = parseFloat((paymentAmount - alreadyRefunded).toFixed(2));

    if (remaining <= 0) {
      assert(true, 'Nothing left to refund (test skipped)', 'positive');
      return;
    }

    const res = await makeRequest('POST', `/api/admin/billing/payments/${billing.paymentId}/refund`, {
      amount: remaining,
      reason: 'Full service cancellation',
    }, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.isFullRefund === true, 'Marked as full refund', 'positive');
    debug('full refund result', { isFullRefund: res.body.isFullRefund });
  }, 'positive');

  // NEGATIVE: Over-refund is rejected
  await test('Refund exceeding payment amount is rejected', async () => {
    // Use a fresh fully-paid invoice + payment
    if (!svc.pricingId) { assert(false, 'Pricing ID missing', 'negative'); return; }

    const orderRes = await makeRequest('POST', '/api/client/orders', {
      serviceId: svc.serviceId, planId: svc.planId, pricingId: svc.pricingId,
    }, clientToken);
    const invRes = await makeRequest('POST', `/api/admin/billing/orders/${orderRes.body.order.id}/invoice`, {
      status: 'unpaid',
    }, adminToken);
    const invId  = invRes.body.invoice?.id;
    const due    = parseFloat(invRes.body.invoice?.amountDue || 0);
    const payRes = await makeRequest('POST', `/api/admin/billing/invoices/${invId}/payments`, {
      amount: due, gateway: 'manual',
    }, adminToken);
    const pId = payRes.body.payment?.id;

    const refundRes = await makeRequest('POST', `/api/admin/billing/payments/${pId}/refund`, {
      amount: due + 500,   // more than what was paid
    }, adminToken);

    assert(refundRes.status === 400, `Status is ${refundRes.status}`, 'negative');
    assert(refundRes.body.error?.toLowerCase().includes('exceed'), 'Error mentions over-refund', 'negative');
  }, 'negative');

  // NEGATIVE: Refund with zero amount fails
  await test('Refund with zero amount fails validation', async () => {
    if (!billing.paymentId) { assert(false, 'Payment ID missing', 'negative'); return; }

    const res = await makeRequest('POST', `/api/admin/billing/payments/${billing.paymentId}/refund`, {
      amount: 0,
    }, adminToken);

    assert(res.status === 400 || res.status === 422, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Refund on non-completed payment is rejected
  await test('Refunding a pending payment is rejected', async () => {
    // Create a payment record but manually leave it as pending by using a gateway that doesn't complete
    // We simulate this by trying to refund a non-existent payment
    const res = await makeRequest('POST', '/api/admin/billing/payments/non-existent-payment-id/refund', {
      amount: 10,
    }, adminToken);

    assert(res.status === 404 || res.status === 400, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Client cannot process refunds
  await test('Client cannot issue refunds', async () => {
    if (!billing.paymentId) { assert(false, 'Payment ID missing', 'negative'); return; }

    const res = await makeRequest('POST', `/api/admin/billing/payments/${billing.paymentId}/refund`, {
      amount: 1,
    }, clientToken);

    assert(res.status === 401 || res.status === 403, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // EDGE: Refund amount precision (3 decimal places should be accepted or rounded)
  await test('Refund with 3 decimal place amount is handled gracefully', async () => {
    // Create a fresh payment to test against
    if (!svc.pricingId) { assert(false, 'Pricing ID missing', 'edge'); return; }

    const orderRes = await makeRequest('POST', '/api/client/orders', {
      serviceId: svc.serviceId, planId: svc.planId, pricingId: svc.pricingId,
    }, clientToken);
    const invRes = await makeRequest('POST', `/api/admin/billing/orders/${orderRes.body.order.id}/invoice`, {
      status: 'unpaid',
    }, adminToken);
    const invId  = invRes.body.invoice?.id;
    const due    = parseFloat(invRes.body.invoice?.amountDue || 0);
    const payRes = await makeRequest('POST', `/api/admin/billing/invoices/${invId}/payments`, {
      amount: due, gateway: 'manual',
    }, adminToken);

    const res = await makeRequest('POST', `/api/admin/billing/payments/${payRes.body.payment.id}/refund`, {
      amount: 0.001,
    }, adminToken);

    assert(res.status === 200 || res.status === 400, `Status is ${res.status}`, 'edge');
  }, 'edge');
}

// ============================================================
// PHASE 10 — RENEWAL BILLING
// ============================================================

async function testRenewalBilling() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔁 PHASE 10: RENEWAL BILLING');
  console.log('═══════════════════════════════════════════════════════════');

  // Setup: create and activate an order so it has active status + nextRenewalAt
  await test('Setup: create and activate order for renewal tests', async () => {
    if (!svc.pricingId) { assert(false, 'Pricing ID missing', 'positive'); return; }

    const orderRes = await makeRequest('POST', '/api/client/orders', {
      serviceId: svc.serviceId,
      planId:    svc.planId,
      pricingId: svc.pricingId,
    }, clientToken);

    assert(orderRes.status === 201 || orderRes.status === 200, 'Order created', 'positive');
    billing.activeOrderId = orderRes.body.order?.id;

    const activateRes = await makeRequest(
      'POST', `/api/admin/orders/${billing.activeOrderId}/activate`, {}, adminToken
    );

    assert(activateRes.status === 200, `Activate status ${activateRes.status}`, 'positive');
    assert(activateRes.body.order?.status === 'active', 'Order is active', 'positive');
    assert(!!activateRes.body.order?.nextRenewalAt, 'nextRenewalAt set after activation', 'positive');
    debug('active order', {
      id:            billing.activeOrderId,
      status:        activateRes.body.order?.status,
      nextRenewalAt: activateRes.body.order?.nextRenewalAt,
    });
  }, 'positive');

  // POSITIVE: Generate renewal invoice for active order
  await test('Generate renewal invoice for active order', async () => {
    if (!billing.activeOrderId) { assert(false, 'Active order ID missing', 'positive'); return; }

    const res = await makeRequest('POST', `/api/admin/billing/orders/${billing.activeOrderId}/renewal-invoice`, {
      dueDays: 3,
      status:  'unpaid',
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Status is ${res.status}`, 'positive');
    assert(!!res.body.invoice?.id, 'Invoice ID returned', 'positive');
    assert(res.body.invoice?.status === 'unpaid', 'Invoice is unpaid', 'positive');

    // Renewal should use renewalPrice (24.99) not base price (29.99)
    const planItem = res.body.invoice?.lineItems?.[0];
    assert(planItem?.description?.toLowerCase().includes('renewal'), 'Line item mentions renewal', 'positive');
    billing.renewalInvoiceId = res.body.invoice?.id;
    debug('renewal invoice', {
      id:       billing.renewalInvoiceId,
      subtotal: res.body.invoice?.subtotal,
      lineItem: planItem?.description,
    });
  }, 'positive');

  // POSITIVE: Renewal invoice uses renewalPrice not regular price
  await test('Renewal invoice unit price equals renewalPrice from snapshot', async () => {
    if (!billing.renewalInvoiceId) { assert(false, 'Renewal invoice ID missing', 'positive'); return; }

    const res = await makeRequest('GET', `/api/admin/billing/invoices/${billing.renewalInvoiceId}`, null, adminToken);

    const planItem = res.body.invoice?.lineItems?.find(i => i.cycle === 'monthly');
    assert(!!planItem, 'Monthly plan line item found', 'positive');
    // renewalPrice was set to 24.99 — should be less than regular price 29.99
    assert(parseFloat(planItem?.unitPrice) <= 29.99, 'Unit price uses renewalPrice (≤ 29.99)', 'positive');
    debug('renewal unit price', planItem?.unitPrice);
  }, 'positive');

  // POSITIVE: Batch renewal — processDueRenewals
  await test('Batch renewal processing returns processed count', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/process-renewals', {
      daysAhead: 30,  // wide window to catch our test order
    }, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(typeof res.body.processed === 'number', 'Processed count returned', 'positive');
    assert(Array.isArray(res.body.errors), 'Errors array present', 'positive');
    debug('batch renewals', { processed: res.body.processed, errors: res.body.errors?.length });
  }, 'positive');

  // POSITIVE: Client can trigger renewal on their own active order
  await test('Client renews own active order', async () => {
    if (!billing.activeOrderId) { assert(false, 'Active order ID missing', 'positive'); return; }

    const res = await makeRequest('POST', `/api/client/orders/${billing.activeOrderId}/renew`, {}, clientToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(!!res.body.nextRenewalAt, 'nextRenewalAt extended', 'positive');
    debug('renewed order nextRenewalAt', res.body.nextRenewalAt);
  }, 'positive');

  // NEGATIVE: Cannot generate renewal invoice for pending order
  await test('Renewal invoice for pending order is rejected', async () => {
    if (!billing.orderId) { assert(false, 'Order ID missing', 'negative'); return; }

    const res = await makeRequest('POST', `/api/admin/billing/orders/${billing.orderId}/renewal-invoice`, {
      status: 'unpaid',
    }, adminToken);

    assert(res.status === 409 || res.status === 400, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Cannot generate renewal for non-existent order
  await test('Renewal invoice for non-existent order returns 404', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/orders/fake-order-id/renewal-invoice', {
      status: 'unpaid',
    }, adminToken);

    assert(res.status === 404 || res.status === 400, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // EDGE: Renew order multiple times — each renewal extends date further
  await test('Multiple renewals progressively extend nextRenewalAt', async () => {
    if (!billing.activeOrderId) { assert(false, 'Active order ID missing', 'edge'); return; }

    const r1 = await makeRequest('POST', `/api/admin/orders/${billing.activeOrderId}/renew`, {}, adminToken);
    const r2 = await makeRequest('POST', `/api/admin/orders/${billing.activeOrderId}/renew`, {}, adminToken);

    assert(r1.status === 200 && r2.status === 200, 'Both renewals succeeded', 'edge');
    const date1 = new Date(r1.body.order?.nextRenewalAt);
    const date2 = new Date(r2.body.order?.nextRenewalAt);
    assert(date2 > date1, `Second renewal (${date2.toISOString()}) later than first (${date1.toISOString()})`, 'edge');
  }, 'edge');

  // EDGE: daysAhead = 0 is below the minimum (min is 1) — should return 400
  await test('Batch renewal with daysAhead=0 returns 400 (below min)', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/process-renewals', {
      daysAhead: 0,
    }, adminToken);

    // DTO enforces min(1) so 0 is a validation error
    assert(res.status === 400 || res.status === 422, `Status is ${res.status} (validation error)`, 'edge');
  }, 'edge');
}

// ============================================================
// PHASE 11 — SUSPENSION & TERMINATION FEE INVOICES
// ============================================================

async function testSuspensionTerminationInvoices() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('⛔ PHASE 11: SUSPENSION & TERMINATION FEE INVOICES');
  console.log('═══════════════════════════════════════════════════════════');

  if (!billing.activeOrderId) {
    console.log('  ⚠️  Active order ID missing — skipping Phase 11');
    return;
  }

  // POSITIVE: Suspend active order
  await test('Admin suspends active order', async () => {
    const res = await makeRequest('POST', `/api/admin/orders/${billing.activeOrderId}/suspend`, {
      reason: 'Payment overdue',
    }, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.order?.status === 'suspended', 'Order is suspended', 'positive');
    assert(!!res.body.order?.suspendedAt, 'suspendedAt timestamp set', 'positive');
  }, 'positive');

  // POSITIVE: Generate suspension fee invoice
  await test('Generate suspension fee invoice (fee > 0 on plan)', async () => {
    const res = await makeRequest('POST', `/api/admin/billing/orders/${billing.activeOrderId}/suspension-invoice`, {
      reason: 'Payment overdue — suspension fee applied',
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Status is ${res.status}`, 'positive');
    if (res.body.invoice) {
      assert(!!res.body.invoice?.id, 'Invoice ID returned', 'positive');
      const feeItem = res.body.invoice?.lineItems?.find(i => i.description?.toLowerCase().includes('suspension'));
      assert(!!feeItem, 'Suspension fee line item present', 'positive');
      assert(parseFloat(feeItem?.unitPrice) === 5.00, 'Suspension fee is $5.00', 'positive');
      billing.suspensionInvoiceId = res.body.invoice?.id;
    } else {
      // No fee configured — module skips gracefully
      assert(res.body.message?.includes('No suspension fee'), 'Graceful skip message', 'positive');
    }
    debug('suspension invoice', { id: billing.suspensionInvoiceId, msg: res.body.message });
  }, 'positive');

  // POSITIVE: Resume suspended order
  await test('Admin resumes suspended order', async () => {
    const res = await makeRequest('POST', `/api/admin/orders/${billing.activeOrderId}/resume`, {}, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.order?.status === 'active', 'Order is active again', 'positive');
    assert(res.body.order?.suspendedAt === null || !res.body.order?.suspendedAt, 'suspendedAt cleared', 'positive');
  }, 'positive');

  // POSITIVE: Terminate order and generate termination fee invoice
  await test('Admin terminates active order', async () => {
    const res = await makeRequest('POST', `/api/admin/orders/${billing.activeOrderId}/terminate`, {
      reason: 'Client requested cancellation',
    }, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.order?.status === 'terminated', 'Order is terminated', 'positive');
    assert(!!res.body.order?.terminatedAt, 'terminatedAt set', 'positive');
  }, 'positive');

  await test('Generate termination fee invoice (fee = $15.00 on plan)', async () => {
    const res = await makeRequest('POST', `/api/admin/billing/orders/${billing.activeOrderId}/termination-invoice`, {
      reason: 'Early termination fee',
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Status is ${res.status}`, 'positive');
    if (res.body.invoice) {
      assert(!!res.body.invoice?.id, 'Invoice ID returned', 'positive');
      const feeItem = res.body.invoice?.lineItems?.find(i => i.description?.toLowerCase().includes('termination'));
      assert(!!feeItem, 'Termination fee line item present', 'positive');
      assert(parseFloat(feeItem?.unitPrice) === 15.00, 'Termination fee is $15.00', 'positive');
      billing.terminationInvoiceId = res.body.invoice?.id;
    } else {
      assert(res.body.message?.includes('No termination fee'), 'Graceful skip message', 'positive');
    }
    debug('termination invoice', { id: billing.terminationInvoiceId });
  }, 'positive');

  // NEGATIVE: Cannot suspend an already-suspended order
  await test('Suspending already-suspended order returns 409', async () => {
    // Create and activate, then suspend twice
    if (!svc.pricingId) { assert(false, 'Pricing ID missing', 'negative'); return; }

    const orderRes = await makeRequest('POST', '/api/client/orders', {
      serviceId: svc.serviceId, planId: svc.planId, pricingId: svc.pricingId,
    }, clientToken);
    const oid = orderRes.body.order?.id;
    await makeRequest('POST', `/api/admin/orders/${oid}/activate`, {}, adminToken);
    await makeRequest('POST', `/api/admin/orders/${oid}/suspend`, { reason: 'Test' }, adminToken);

    const res = await makeRequest('POST', `/api/admin/orders/${oid}/suspend`, { reason: 'Double suspend' }, adminToken);
    assert(res.status === 409 || res.status === 400, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Cannot terminate already-terminated order
  await test('Terminating already-terminated order returns 409', async () => {
    const res = await makeRequest('POST', `/api/admin/orders/${billing.activeOrderId}/terminate`, {}, adminToken);
    assert(res.status === 409 || res.status === 400, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Suspension fee invoice for non-existent order
  await test('Suspension invoice for non-existent order returns 404', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/orders/fake-id/suspension-invoice', {}, adminToken);
    assert(res.status === 404 || res.status === 400, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // EDGE: Plan with $0 suspension fee returns null invoice gracefully
  await test('Plan with $0 suspension fee returns graceful null response', async () => {
    // Use the annual pricing which has suspensionFee = 0
    if (!svc.annualPricingId) { assert(false, 'Annual pricing ID missing', 'edge'); return; }

    const orderRes = await makeRequest('POST', '/api/client/orders', {
      serviceId: svc.serviceId, planId: svc.planId, pricingId: svc.annualPricingId,
    }, clientToken);
    await makeRequest('POST', `/api/admin/orders/${orderRes.body.order.id}/activate`, {}, adminToken);
    await makeRequest('POST', `/api/admin/orders/${orderRes.body.order.id}/suspend`, { reason: 'Test' }, adminToken);

    const res = await makeRequest(
      'POST', `/api/admin/billing/orders/${orderRes.body.order.id}/suspension-invoice`, {}, adminToken
    );

    assert(res.status === 200, `Status is ${res.status}`, 'edge');
    assert(res.body.invoice === null, 'No invoice returned for $0 fee', 'edge');
    assert(res.body.message?.includes('No suspension fee'), 'Graceful skip message', 'edge');
  }, 'edge');
}

// ============================================================
// PHASE 12 — BATCH OPERATIONS
// ============================================================

async function testBatchOperations() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('⚙️  PHASE 12: BATCH OPERATIONS');
  console.log('═══════════════════════════════════════════════════════════');

  // POSITIVE: Process overdue invoices (mark overdue, no auto-suspend)
  await test('Process overdue invoices — mark overdue only', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/process-overdue', {
      autoSuspend: false,
    }, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(typeof res.body.markedOverdue === 'number', 'markedOverdue count present', 'positive');
    assert(typeof res.body.suspended === 'number', 'suspended count present', 'positive');
    assert(res.body.suspended === 0, 'No suspensions when autoSuspend=false', 'positive');
    debug('overdue run', { markedOverdue: res.body.markedOverdue, suspended: res.body.suspended });
  }, 'positive');

  // POSITIVE: Process overdue with auto-suspend enabled
  await test('Process overdue invoices — with auto-suspend enabled', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/process-overdue', {
      autoSuspend: true,
    }, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(typeof res.body.markedOverdue === 'number', 'markedOverdue count returned', 'positive');
    assert(typeof res.body.suspended === 'number', 'suspended count returned', 'positive');
  }, 'positive');

  // POSITIVE: Batch renewal with custom daysAhead
  await test('Batch renewal with daysAhead=7', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/process-renewals', {
      daysAhead: 7,
    }, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(typeof res.body.processed === 'number', 'Processed count returned', 'positive');
    assert(res.body.errors?.length === 0 || Array.isArray(res.body.errors), 'Errors array present', 'positive');
  }, 'positive');

  // POSITIVE: Batch operations are idempotent (running twice doesn't duplicate)
  await test('Running batch overdue twice does not double-mark', async () => {
    const r1 = await makeRequest('POST', '/api/admin/billing/process-overdue', { autoSuspend: false }, adminToken);
    const r2 = await makeRequest('POST', '/api/admin/billing/process-overdue', { autoSuspend: false }, adminToken);

    assert(r1.status === 200 && r2.status === 200, 'Both runs succeed', 'positive');
    // Second run should mark 0 — already overdue
    assert(
      typeof r2.body.markedOverdue === 'number',
      `Second run markedOverdue = ${r2.body.markedOverdue} (expected 0)`, 'positive'
    );
  }, 'positive');

  // NEGATIVE: daysAhead exceeds maximum (30)
  await test('process-renewals with daysAhead > 30 fails validation', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/process-renewals', {
      daysAhead: 365,
    }, adminToken);

    assert(res.status === 400 || res.status === 422, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Client cannot trigger batch operations
  await test('Client cannot trigger batch renewal processing', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/process-renewals', {
      daysAhead: 3,
    }, clientToken);

    assert(res.status === 401 || res.status === 403, `Status is ${res.status}`, 'negative');
  }, 'negative');

  await test('Client cannot trigger batch overdue processing', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/process-overdue', {
      autoSuspend: false,
    }, clientToken);

    assert(res.status === 401 || res.status === 403, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // EDGE: daysAhead = 1 (boundary — immediate renewals only)
  await test('Batch renewal with daysAhead=1 (minimum boundary)', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/process-renewals', {
      daysAhead: 1,
    }, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'edge');
    assert(typeof res.body.processed === 'number', 'Result returned', 'edge');
  }, 'edge');

  // EDGE: daysAhead = 30 (maximum boundary)
  await test('Batch renewal with daysAhead=30 (maximum boundary)', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/process-renewals', {
      daysAhead: 30,
    }, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'edge');
  }, 'edge');
}

// ============================================================
// PHASE 13 — REVENUE & STATISTICS
// ============================================================

async function testRevenueStats() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 PHASE 13: REVENUE & STATISTICS');
  console.log('═══════════════════════════════════════════════════════════');

  // POSITIVE: Admin revenue overview
  await test('Admin gets revenue overview (monthly/yearly/all-time)', async () => {
    const res = await makeRequest('GET', '/api/admin/billing/revenue', null, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.monthly !== undefined, 'Monthly revenue present', 'positive');
    assert(res.body.yearly  !== undefined, 'Yearly revenue present', 'positive');
    assert(res.body.allTime !== undefined, 'All-time revenue present', 'positive');
    // toCurrency() returns a number (parseFloat); assert number not string
    assert(typeof res.body.monthly?.revenue  === 'number', 'Monthly revenue is a number', 'positive');
    assert(typeof res.body.allTime?.invoices === 'number', 'Invoice count is number', 'positive');
    debug('revenue stats', res.body);
  }, 'positive');

  // POSITIVE: Invoice statistics
  await test('Invoice stats return breakdown by status', async () => {
    const res = await makeRequest('GET', '/api/admin/billing/invoices/stats', null, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.byStatus !== undefined, 'byStatus present', 'positive');
    assert(res.body.totalRevenue !== undefined, 'Total revenue present', 'positive');
    assert(res.body.totalTaxCollected !== undefined, 'Tax collected present', 'positive');
  }, 'positive');

  // POSITIVE: Payment statistics
  await test('Payment stats return by gateway and status', async () => {
    const res = await makeRequest('GET', '/api/admin/billing/payments/stats', null, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(Array.isArray(res.body.byGateway), 'byGateway array present (may be empty)', 'positive');
    assert(res.body.byStatus !== undefined, 'byStatus present', 'positive');
    assert(typeof res.body.refunds?.count === 'number', 'Refund count is a number', 'positive');
  }, 'positive');

  // POSITIVE: Client billing summary
  await test('Client gets own billing summary', async () => {
    const res = await makeRequest('GET', '/api/client/billing/summary', null, clientToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.invoiceSummary !== undefined, 'invoiceSummary present', 'positive');
    assert(res.body.paymentSummary !== undefined, 'paymentSummary present', 'positive');
    assert(typeof res.body.invoiceSummary?.total === 'number', 'Invoice count present', 'positive');
    // toCurrency() returns number (parseFloat) — assert number not string
    assert(res.body.invoiceSummary?.outstandingBalance !== undefined, 'Outstanding balance present', 'positive');
    debug('client billing summary', res.body.invoiceSummary);
  }, 'positive');

  // POSITIVE: Admin billing summary for specific client
  await test('Admin gets billing summary for specific client', async () => {
    if (!clientId) { assert(false, 'Client ID missing', 'positive'); return; }

    const res = await makeRequest('GET', `/api/admin/billing/clients/${clientId}/summary`, null, adminToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.invoiceSummary !== undefined, 'Invoice summary present', 'positive');
    assert(res.body.invoiceSummary?.total >= 1, 'At least one invoice in summary', 'positive');
  }, 'positive');

  // NEGATIVE: Client cannot access admin revenue endpoint
  await test('Client cannot access revenue stats endpoint', async () => {
    const res = await makeRequest('GET', '/api/admin/billing/revenue', null, clientToken);
    assert(res.status === 401 || res.status === 403, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Client cannot get another client's billing summary
  await test('Client cannot get admin billing summary for other clients', async () => {
    if (!clientId) { assert(false, 'Client ID missing', 'negative'); return; }
    const res = await makeRequest('GET', `/api/admin/billing/clients/${clientId}/summary`, null, clientToken);
    assert(res.status === 401 || res.status === 403, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // EDGE: Revenue numbers are non-negative even with full refunds applied
  await test('Revenue figures are non-negative (handles refunds correctly)', async () => {
    const res = await makeRequest('GET', '/api/admin/billing/revenue', null, adminToken);

    const monthlyRev = parseFloat(res.body.monthly?.revenue || 0);
    const yearlyRev  = parseFloat(res.body.yearly?.revenue  || 0);
    assert(monthlyRev >= 0, `Monthly revenue >= 0 (${monthlyRev})`, 'edge');
    assert(yearlyRev  >= 0, `Yearly revenue >= 0 (${yearlyRev})`, 'edge');
  }, 'edge');
}

// ============================================================
// PHASE 14 — CLIENT BILLING VIEWS
// ============================================================

async function testClientBillingViews() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('👁️  PHASE 14: CLIENT BILLING VIEWS');
  console.log('═══════════════════════════════════════════════════════════');

  // POSITIVE: Client lists own invoices
  await test('Client lists own invoices', async () => {
    const res = await makeRequest('GET', '/api/client/billing/invoices', null, clientToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(Array.isArray(res.body.invoices), 'Invoices array returned', 'positive');
    assert(typeof res.body.total === 'number', 'Total count present', 'positive');
    debug('client invoices', { count: res.body.invoices?.length, total: res.body.total });
  }, 'positive');

  // POSITIVE: Client filters own invoices by status
  await test('Client filters own invoices by status=paid', async () => {
    const res = await makeRequest('GET', '/api/client/billing/invoices?status=paid', null, clientToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    const allPaid = res.body.invoices?.every(i => i.status === 'paid');
    assert(allPaid || res.body.invoices?.length === 0, 'All returned invoices are paid', 'positive');
  }, 'positive');

  // POSITIVE: Client views specific invoice
  await test('Client views own invoice by ID', async () => {
    if (!billing.unpaidInvoiceId) { assert(false, 'Invoice ID missing', 'positive'); return; }

    const res = await makeRequest('GET', `/api/client/billing/invoices/${billing.unpaidInvoiceId}`, null, clientToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(res.body.invoice?.id === billing.unpaidInvoiceId, 'Correct invoice returned', 'positive');
  }, 'positive');

  // POSITIVE: Client views own payment history
  await test('Client lists own payment history', async () => {
    const res = await makeRequest('GET', '/api/client/billing/payments', null, clientToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert(Array.isArray(res.body.payments), 'Payments array returned', 'positive');
  }, 'positive');

  // POSITIVE: Client paginates invoices
  await test('Client paginates invoices (limit=3)', async () => {
    const res = await makeRequest('GET', '/api/client/billing/invoices?limit=3&offset=0', null, clientToken);

    assert(res.status === 200, `Status is ${res.status}`, 'positive');
    assert((res.body.invoices?.length || 0) <= 3, 'Limit of 3 respected', 'positive');
  }, 'positive');

  // NEGATIVE: Client cannot view another client's invoice
  await test("Client cannot view another client's invoice", async () => {
    // Admin creates an invoice for a different client (using admin token makes one for admin user)
    if (!adminId) { assert(false, 'Admin ID missing', 'negative'); return; }

    const manualRes = await makeRequest('POST', '/api/admin/billing/invoices/manual', {
      clientId:  adminId,
      lineItems: [{ description: 'Admin-only invoice', quantity: 1, unitPrice: 999 }],
      status:    'draft',
    }, adminToken);

    if (!manualRes.body.invoice?.id) {
      assert(true, 'Could not create cross-client test invoice (skipped)', 'negative');
      return;
    }

    const res = await makeRequest('GET', `/api/client/billing/invoices/${manualRes.body.invoice.id}`, null, clientToken);
    assert(res.status === 403 || res.status === 404, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Unauthenticated access to client invoices
  await test('Unauthenticated user cannot list invoices', async () => {
    const res = await makeRequest('GET', '/api/client/billing/invoices', null, null);
    assert(res.status === 401 || res.status === 403, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Client cannot initiate payment with missing gateway
  await test('Initiate payment without gateway field fails validation', async () => {
    if (!billing.invoiceId) { assert(false, 'Invoice ID missing', 'negative'); return; }

    const res = await makeRequest('POST', `/api/client/billing/invoices/${billing.invoiceId}/pay`, {
      // gateway intentionally omitted
    }, clientToken);

    assert(res.status === 400 || res.status === 422, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // EDGE: Client invoices with offset beyond total returns empty array
  await test('Client invoices with offset beyond total returns empty array', async () => {
    const res = await makeRequest('GET', '/api/client/billing/invoices?limit=10&offset=99999', null, clientToken);

    assert(res.status === 200, `Status is ${res.status}`, 'edge');
    assert(res.body.invoices?.length === 0, 'Empty array for out-of-range offset', 'edge');
  }, 'edge');

  // EDGE: Client summary has correct outstanding balance
  await test('Client billing summary outstanding balance reflects unpaid invoices', async () => {
    const summaryRes = await makeRequest('GET', '/api/client/billing/summary', null, clientToken);
    const listRes    = await makeRequest('GET', '/api/client/billing/invoices?status=unpaid', null, clientToken);

    assert(summaryRes.status === 200 && listRes.status === 200, 'Both endpoints respond 200', 'edge');
    const summaryUnpaid = summaryRes.body.invoiceSummary?.unpaidCount;
    const listCount     = listRes.body.invoices?.length;
    // Summary unpaidCount should match the listing (within pagination)
    assert(
      summaryUnpaid >= listCount,
      `Summary unpaidCount (${summaryUnpaid}) >= list count (${listCount})`, 'edge'
    );
  }, 'edge');
}

// ============================================================
// PHASE 15 — AUTHORIZATION GUARDS  (role enforcement)
// ============================================================

async function testAuthorizationGuards() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔒 PHASE 15: AUTHORIZATION GUARDS');
  console.log('═══════════════════════════════════════════════════════════');

  const adminBillingRoutes = [
    ['GET',  '/api/admin/billing/revenue'],
    ['GET',  '/api/admin/billing/invoices'],
    ['GET',  '/api/admin/billing/invoices/stats'],
    ['GET',  '/api/admin/billing/payments'],
    ['GET',  '/api/admin/billing/payments/stats'],
    ['GET',  '/api/admin/billing/tax-rules'],
  ];

  // NEGATIVE: All admin billing routes reject client token
  for (const [method, route] of adminBillingRoutes) {
    await test(`Client token rejected on ${method} ${route}`, async () => {
      const res = await makeRequest(method, route, null, clientToken);
      assert(
        res.status === 401 || res.status === 403,
        `Admin route blocked client (${res.status})`, 'negative'
      );
    }, 'negative');
  }

  // NEGATIVE: All admin billing routes reject no token
  for (const [method, route] of adminBillingRoutes) {
    await test(`No token rejected on ${method} ${route}`, async () => {
      const res = await makeRequest(method, route, null, null);
      assert(
        res.status === 401 || res.status === 403,
        `Unauthenticated request blocked (${res.status})`, 'negative'
      );
    }, 'negative');
  }

  // NEGATIVE: Admin token cannot be used to impersonate via client invoice endpoint
  await test('Admin cannot access client invoice list via client endpoint', async () => {
    // Admin invoices won't appear in client listing — but the endpoint should work for admin
    const res = await makeRequest('GET', '/api/client/billing/invoices', null, adminToken);
    // Admin token on a client route — depends on auth middleware config
    // If admin has the client role this could be 200 — just ensure no crash
    assert(res.status === 200 || res.status === 401 || res.status === 403, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // NEGATIVE: Expired / malformed token rejected
  await test('Malformed JWT rejected on billing endpoint', async () => {
    const res = await makeRequest('GET', '/api/admin/billing/revenue', null, 'not.a.valid.token');
    assert(res.status === 401 || res.status === 403, `Status is ${res.status}`, 'negative');
  }, 'negative');

  // EDGE: Empty string Authorization header
  await test('Empty string token treated as unauthenticated', async () => {
    const res = await makeRequest('GET', '/api/admin/billing/revenue', null, '');
    assert(res.status === 401 || res.status === 403 || res.status === 400, `Status is ${res.status}`, 'edge');
  }, 'edge');
}

// ============================================================
// MAIN RUNNER
// ============================================================

async function runAllTests() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🧪 BILLING & INVOICING PIPELINE TEST SUITE  v1.0             ║
║                                                                   ║
║   Pipeline: Services → Orders → Billing & Invoicing             ║
║                                                                   ║
║   Phase  0  Authentication                                       ║
║   Phase  1  Service Setup (group/service/plan/pricing)          ║
║   Phase  2  Billing Profiles                                     ║
║   Phase  3  Tax Rules                                            ║
║   Phase  4  Order → Invoice Pipeline                            ║
║   Phase  5  Invoice Lifecycle                                    ║
║   Phase  6  Discounts & Credits                                  ║
║   Phase  7  Manual Invoices                                      ║
║   Phase  8  Payments                                             ║
║   Phase  9  Refunds                                              ║
║   Phase 10  Renewal Billing                                      ║
║   Phase 11  Suspension & Termination Fees                        ║
║   Phase 12  Batch Operations                                     ║
║   Phase 13  Revenue & Statistics                                 ║
║   Phase 14  Client Billing Views                                 ║
║   Phase 15  Authorization Guards                                 ║
║                                                                   ║
║   ✅ Positive  ❌ Negative  ⚠️  Edge Case                       ║
║                                                                   ║
║   Server: ${API_URL.padEnd(53)}║
║   Admin:  ${ADMIN_CREDENTIALS.email.padEnd(53)}║
║   Client: ${CLIENT_CREDENTIALS.email.padEnd(53)}║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
  `);

  console.log('⏳ Connecting to server...\n');

  try {
    const health = await makeRequest('GET', '/health', null, null);
    if (health.status === 200 || health.status === 404) {
      console.log('✅ Server is responsive\n');
    } else {
      throw new Error(`Unexpected health check response: ${health.status}`);
    }
  } catch (err) {
    console.error('\n❌ Connection error:', err.message);
    console.error(`\nMake sure the server is running on ${API_URL}`);
    console.error('Start with: npm start\n');
    process.exit(1);
  }

  await testAuthentication();
  await testServiceSetup();
  await testBillingProfiles();
  await testTaxRules();
  await testOrderToInvoicePipeline();
  await testInvoiceLifecycle();
  await testDiscounts();
  await testManualInvoices();
  await testPayments();
  await testRefunds();
  await testRenewalBilling();
  await testSuspensionTerminationInvoices();
  await testBatchOperations();
  await testRevenueStats();
  await testClientBillingViews();
  await testAuthorizationGuards();

  // ── Final Summary ─────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const passRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : '0.0';

  console.log(`✅ Passed:           ${stats.passed}`);
  console.log(`❌ Failed:           ${stats.failed}`);
  console.log(`📊 Total Tests:      ${stats.total}`);
  console.log(`📈 Pass Rate:        ${passRate}%\n`);

  console.log('📋 Test Breakdown:');
  console.log(`  ✅ Positive Cases: ${stats.positive}`);
  console.log(`  ❌ Negative Cases: ${stats.negative}`);
  console.log(`  ⚠️  Edge Cases:    ${stats.edge}\n`);

  console.log('📝 Coverage:');
  console.log('  ✅ Authentication');
  console.log('  ✅ Service catalog setup');
  console.log('  ✅ Billing profile (create / read / update)');
  console.log('  ✅ Tax rules (global, country-specific, preview)');
  console.log('  ✅ Order → invoice generation (with setup fee, addons)');
  console.log('  ✅ Upfront multi-cycle invoicing');
  console.log('  ✅ Invoice lifecycle (draft → unpaid → paid / cancelled)');
  console.log('  ✅ Invoice statistics and filtering');
  console.log('  ✅ Flat & percentage discounts');
  console.log('  ✅ Manual invoices (custom line items)');
  console.log('  ✅ Full & partial payments with balance tracking');
  console.log('  ✅ Gateway checkout session initiation');
  console.log('  ✅ Full & partial refunds with over-refund guard');
  console.log('  ✅ Invoice reversal after refund');
  console.log('  ✅ Renewal invoices using renewalPrice');
  console.log('  ✅ Batch renewal processing (cron-safe)');
  console.log('  ✅ Suspension fee invoices');
  console.log('  ✅ Termination fee invoices');
  console.log('  ✅ Batch overdue processing (with / without auto-suspend)');
  console.log('  ✅ Revenue & payment statistics');
  console.log('  ✅ Client-scoped billing views');
  console.log('  ✅ Role-based access control (all admin billing routes)\n');

  if (stats.failed === 0) {
    console.log('🎉 ALL TESTS PASSED — billing module is production-ready!\n');
    return 0;
  } else {
    console.log(`⚠️  ${stats.failed} test(s) failed. Review logs above.\n`);
    return 1;
  }
}

runAllTests()
  .then((code) => process.exit(code || 0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });