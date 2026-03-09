#!/usr/bin/env node

/**
 * Full Lifecycle Test Script - WITH POSITIVE & NEGATIVE SCENARIOS
 * Tests: Auth → Services → Orders → Invoices → Renewals
 * Including: Edge cases, error conditions, and boundary scenarios
 * 
 * Real Credentials:
 * - Admin: superadmin@example.com / SuperAdmin123!
 * - Client: ihammad317@gmail.com / abcxyz7800
 * 
 * Usage: node test-lifecycle-comprehensive.js
 * 
 * This script tests:
 * ✅ Positive scenarios (happy path)
 * ❌ Negative scenarios (error cases)
 * ⚠️  Edge cases & boundaries
 */

const http = require('http');
const https = require('https');

// ============================================================
// Configuration
// ============================================================
const API_PORT = process.env.API_PORT || 4000;
const API_URL = `http://localhost:${API_PORT}`;
const USE_HTTPS = process.env.API_HTTPS === 'true';
const HTTP_CLIENT = USE_HTTPS ? https : http;

// Real Credentials
const ADMIN_CREDENTIALS = {
  email: 'superadmin@example.com',
  password: 'SuperAdmin123!',
};

const CLIENT_CREDENTIALS = {
  email: 'ihammad317@gmail.com',
  password: 'abcxyz7800',
};

// Invalid Credentials (for negative testing)
const INVALID_CREDENTIALS = {
  validEmail_wrongPassword: {
    email: 'superadmin@example.com',
    password: 'WrongPassword123!',
  },
  invalidEmail: {
    email: 'nonexistent@example.com',
    password: 'SomePassword123!',
  },
  noPassword: {
    email: 'superadmin@example.com',
  },
  noEmail: {
    password: 'SuperAdmin123!',
  },
  emptyCredentials: {
    email: '',
    password: '',
  },
};

// Tokens
let adminToken = null;
let clientToken = null;
let adminId = null;
let clientId = null;

// Test data
const data = {};
let passedTests = 0;
let failedTests = 0;
let testCount = 0;

// Test categories
let positiveTests = 0;
let negativeTests = 0;
let edgeTests = 0;

// ============================================================
// Utility Functions
// ============================================================

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TestSuite/2.0',
      },
      timeout: 30000,
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = HTTP_CLIENT.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: responseData,
            parseError: e.message,
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

function assert(condition, message, type = 'positive') {
  testCount++;
  if (type === 'negative') negativeTests++;
  if (type === 'edge') edgeTests++;
  if (type === 'positive') positiveTests++;

  if (condition) {
    console.log(`  ✅ ${message}`);
    passedTests++;
    return true;
  } else {
    console.log(`  ❌ ${message}`);
    failedTests++;
    return false;
  }
}

async function test(name, fn) {
  console.log(`\n📝 ${name}`);
  try {
    await fn();
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`);
    failedTests++;
    testCount++;
  }
}

function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toISOString().split('T')[0];
}

function debug(label, data) {
  if (process.env.DEBUG) {
    console.log(`  🔍 ${label}:`, JSON.stringify(data, null, 2));
  }
}

// ============================================================
// AUTHENTICATION - Positive & Negative
// ============================================================

async function authenticate() {
  console.log('\n🔐 AUTHENTICATION PHASE\n');

  // ===== POSITIVE: Valid Login =====
  await test('✅ POSITIVE: Admin login with valid credentials', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
    });

    assert(res.status === 200 || res.status === 201, `Status is ${res.status}`, 'positive');
    assert(res.body.accessToken || res.body.token, 'Token received', 'positive');
    assert(res.body.user?.id, 'User ID present', 'positive');

    adminToken = res.body.accessToken || res.body.token;
    adminId = res.body.user?.id;

    console.log(`    Token: ${adminToken?.substring(0, 30)}...`);
  });

  await test('✅ POSITIVE: Client login with valid credentials', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      email: CLIENT_CREDENTIALS.email,
      password: CLIENT_CREDENTIALS.password,
    });

    assert(res.status === 200 || res.status === 201, `Status is ${res.status}`, 'positive');
    assert(res.body.accessToken || res.body.token, 'Token received', 'positive');

    clientToken = res.body.accessToken || res.body.token;
    clientId = res.body.user?.id;
  });

  // ===== NEGATIVE: Invalid Password =====
  await test('❌ NEGATIVE: Login with valid email, wrong password', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      email: INVALID_CREDENTIALS.validEmail_wrongPassword.email,
      password: INVALID_CREDENTIALS.validEmail_wrongPassword.password,
    });

    assert(res.status === 401 || res.status === 400, `Should fail with 401/400, got ${res.status}`, 'negative');
    assert(res.body.error, 'Error message present', 'negative');
    console.log(`    Error: "${res.body.error}"`);
  });

  // ===== NEGATIVE: Non-existent Email =====
  await test('❌ NEGATIVE: Login with non-existent email', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      email: INVALID_CREDENTIALS.invalidEmail.email,
      password: INVALID_CREDENTIALS.invalidEmail.password,
    });

    assert(res.status === 401 || res.status === 404, `Should fail with 401/404, got ${res.status}`, 'negative');
    assert(res.body.error, 'Error message present', 'negative');
  });

  // ===== EDGE: Missing Password =====
  await test('⚠️  EDGE: Login with missing password', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      email: ADMIN_CREDENTIALS.email,
    });

    assert(res.status === 400, `Should fail with 400, got ${res.status}`, 'edge');
    assert(res.body.error, 'Error message present', 'edge');
  });

  // ===== EDGE: Missing Email =====
  await test('⚠️  EDGE: Login with missing email', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      password: ADMIN_CREDENTIALS.password,
    });

    assert(res.status === 400, `Should fail with 400, got ${res.status}`, 'edge');
    assert(res.body.error, 'Error message present', 'edge');
  });

  // ===== EDGE: Empty Credentials =====
  await test('⚠️  EDGE: Login with empty credentials', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      email: '',
      password: '',
    });

    assert(res.status === 400 || res.status === 401, `Should fail, got ${res.status}`, 'edge');
  });

  // Check authentication succeeded
  if (!adminToken || !clientToken) {
    console.error('\n❌ Authentication failed. Cannot continue tests.');
    process.exit(1);
  }

  console.log('\n✅ Authentication phase complete!\n');
}

// ============================================================
// TESTS - Positive & Negative Scenarios
// ============================================================

async function runTests() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   COMPREHENSIVE TEST SUITE');
  console.log('   Positive + Negative + Edge Case Testing');
  console.log(`   Server: ${API_URL}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    await authenticate();
  } catch (err) {
    console.error('\n❌ Authentication failed:', err.message);
    process.exit(1);
  }

  // ========================================
  // Phase 1: Service Setup
  // ========================================
  console.log('\n🔵 PHASE 1: SERVICE SETUP\n');

  // POSITIVE: Create service
  await test('✅ POSITIVE: Create service with valid data', async () => {
    const res = await makeRequest('POST', '/api/admin/services', {
      code: 'test-service-' + Date.now(),
      name: 'Test Service',
      description: 'Test service description',
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Created (status ${res.status})`, 'positive');
    assert(res.body.id, 'Service has ID', 'positive');
    assert(res.body.active === true, 'Service is active', 'positive');

    data.serviceId = res.body.id;
  });

  // NEGATIVE: Create service without admin token
  await test('❌ NEGATIVE: Create service without authentication', async () => {
    const res = await makeRequest('POST', '/api/admin/services', {
      code: 'unauthorized-service',
      name: 'Unauthorized',
    }, null); // No token

    assert(res.status === 401 || res.status === 403, `Should fail with 401/403, got ${res.status}`, 'negative');
    console.log(`    Status: ${res.status}`);
  });

  // NEGATIVE: Create service with client token (insufficient permissions)
  await test('❌ NEGATIVE: Create service with client token (no permission)', async () => {
    const res = await makeRequest('POST', '/api/admin/services', {
      code: 'client-service',
      name: 'Client Created',
    }, clientToken);

    assert(res.status === 401 || res.status === 403 || res.status === 404, `Should fail, got ${res.status}`, 'negative');
  });

  // EDGE: Create service with missing name
  await test('⚠️  EDGE: Create service with missing name', async () => {
    const res = await makeRequest('POST', '/api/admin/services', {
      code: 'incomplete-service',
    }, adminToken);

    assert(res.status === 400, `Should fail with 400, got ${res.status}`, 'edge');
  });

  // EDGE: Create service with very long code
  await test('⚠️  EDGE: Create service with very long code', async () => {
    const res = await makeRequest('POST', '/api/admin/services', {
      code: 'a'.repeat(500),
      name: 'Long Code Service',
    }, adminToken);

    assert(res.status === 400 || res.status === 201, `Response received (status ${res.status})`, 'edge');
  });

  // Skip rest if service not created
  if (!data.serviceId) {
    console.log('\n⚠️  Cannot continue: Service creation failed');
    process.exit(1);
  }

  // POSITIVE: Create plan
  await test('✅ POSITIVE: Create plan with valid data', async () => {
    const res = await makeRequest('POST', `/api/admin/services/${data.serviceId}/plans`, {
      name: 'Test Plan',
      description: 'Test plan',
      position: 1,
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Created (status ${res.status})`, 'positive');
    assert(res.body.id, 'Plan has ID', 'positive');

    data.planId = res.body.id;
  });

  // NEGATIVE: Create plan for non-existent service
  await test('❌ NEGATIVE: Create plan for non-existent service', async () => {
    const res = await makeRequest('POST', '/api/admin/services/99999/plans', {
      name: 'Orphan Plan',
    }, adminToken);

    assert(res.status === 404 || res.status === 400, `Should fail with 404/400, got ${res.status}`, 'negative');
  });

  // EDGE: Create plan with missing name
  await test('⚠️  EDGE: Create plan with missing name', async () => {
    const res = await makeRequest('POST', `/api/admin/services/${data.serviceId}/plans`, {
      position: 1,
    }, adminToken);

    assert(res.status === 400, `Should fail with 400, got ${res.status}`, 'edge');
  });

  if (!data.planId) {
    console.log('\n⚠️  Cannot continue: Plan creation failed');
    process.exit(1);
  }

  // POSITIVE: Create pricing
  await test('✅ POSITIVE: Create monthly pricing', async () => {
    const res = await makeRequest('POST', `/api/admin/plans/${data.planId}/pricing`, {
      cycle: 'monthly',
      price: 99.99,
      currency: 'USD',
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Created (status ${res.status})`, 'positive');
    assert(res.body.id, 'Pricing has ID', 'positive');

    data.monthlyPricingId = res.body.id;
  });

  // NEGATIVE: Create pricing with negative price
  await test('❌ NEGATIVE: Create pricing with negative price', async () => {
    const res = await makeRequest('POST', `/api/admin/plans/${data.planId}/pricing`, {
      cycle: 'monthly',
      price: -99.99,
      currency: 'USD',
    }, adminToken);

    assert(res.status === 400, `Should fail with 400, got ${res.status}`, 'negative');
  });

  // NEGATIVE: Create pricing with invalid cycle
  await test('❌ NEGATIVE: Create pricing with invalid cycle', async () => {
    const res = await makeRequest('POST', `/api/admin/plans/${data.planId}/pricing`, {
      cycle: 'invalid-cycle',
      price: 99.99,
      currency: 'USD',
    }, adminToken);

    assert(res.status === 400, `Should fail with 400, got ${res.status}`, 'negative');
  });

  // EDGE: Create pricing with zero price
  await test('⚠️  EDGE: Create pricing with zero price', async () => {
    const res = await makeRequest('POST', `/api/admin/plans/${data.planId}/pricing`, {
      cycle: 'monthly',
      price: 0,
      currency: 'USD',
    }, adminToken);

    assert(res.status === 400 || res.status === 201, `Response received (status ${res.status})`, 'edge');
  });

  // POSITIVE: Create annual pricing
  await test('✅ POSITIVE: Create annual pricing', async () => {
    const res = await makeRequest('POST', `/api/admin/plans/${data.planId}/pricing`, {
      cycle: 'annually',
      price: 999.99,
      currency: 'USD',
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Created (status ${res.status})`, 'positive');

    data.annualPricingId = res.body.id;
  });

  // ========================================
  // Phase 2: Order Creation - Positive & Negative
  // ========================================
  console.log('\n🔵 PHASE 2: ORDER CREATION & VALIDATION\n');

  // POSITIVE: Create order
  await test('✅ POSITIVE: Client creates order with valid data', async () => {
    const res = await makeRequest('POST', '/api/client/orders', {
      serviceId: data.serviceId,
      planId: data.planId,
      pricingId: data.monthlyPricingId,
    }, clientToken);

    assert(res.status === 201 || res.status === 200, `Created (status ${res.status})`, 'positive');
    assert(res.body.id, 'Order has ID', 'positive');
    assert(res.body.status === 'pending', 'Order is pending', 'positive');

    data.monthlyOrderId = res.body.id;
  });

  // NEGATIVE: Create order without authentication
  await test('❌ NEGATIVE: Create order without authentication', async () => {
    const res = await makeRequest('POST', '/api/client/orders', {
      serviceId: data.serviceId,
      planId: data.planId,
      pricingId: data.monthlyPricingId,
    }, null);

    assert(res.status === 401 || res.status === 403, `Should fail, got ${res.status}`, 'negative');
  });

  // NEGATIVE: Create order with invalid service ID
  await test('❌ NEGATIVE: Create order with invalid service ID', async () => {
    const res = await makeRequest('POST', '/api/client/orders', {
      serviceId: 99999,
      planId: data.planId,
      pricingId: data.monthlyPricingId,
    }, clientToken);

    assert(res.status === 404 || res.status === 400, `Should fail, got ${res.status}`, 'negative');
  });

  // NEGATIVE: Create order with invalid pricing ID
  await test('❌ NEGATIVE: Create order with invalid pricing ID', async () => {
    const res = await makeRequest('POST', '/api/client/orders', {
      serviceId: data.serviceId,
      planId: data.planId,
      pricingId: 99999,
    }, clientToken);

    assert(res.status === 404 || res.status === 400, `Should fail, got ${res.status}`, 'negative');
  });

  // EDGE: Create order with missing pricing ID
  await test('⚠️  EDGE: Create order with missing pricing ID', async () => {
    const res = await makeRequest('POST', '/api/client/orders', {
      serviceId: data.serviceId,
      planId: data.planId,
    }, clientToken);

    assert(res.status === 400, `Should fail with 400, got ${res.status}`, 'edge');
  });

  // ========================================
  // Phase 3: Order Activation & Status
  // ========================================
  console.log('\n🔵 PHASE 3: ORDER ACTIVATION & STATUS\n');

  // POSITIVE: Activate order
  await test('✅ POSITIVE: Admin activates order', async () => {
    const res = await makeRequest('POST', `/api/admin/orders/${data.monthlyOrderId}/activate`, {}, adminToken);

    assert(res.status === 200, `Activated (status ${res.status})`, 'positive');
    assert(res.body.status === 'active', 'Status is active', 'positive');
    assert(res.body.nextRenewalAt, 'Has renewal date', 'positive');

    data.monthlyActivatedAt = res.body.startedAt;
    data.monthlyNextRenewal = res.body.nextRenewalAt;
  });

  // NEGATIVE: Activate order without authentication
  await test('❌ NEGATIVE: Activate order without authentication', async () => {
    // Create new order first
    const orderRes = await makeRequest('POST', '/api/client/orders', {
      serviceId: data.serviceId,
      planId: data.planId,
      pricingId: data.monthlyPricingId,
    }, clientToken);
    const orderId = orderRes.body.id;

    const res = await makeRequest('POST', `/api/admin/orders/${orderId}/activate`, {}, null);

    assert(res.status === 401 || res.status === 403, `Should fail, got ${res.status}`, 'negative');
  });

  // NEGATIVE: Activate non-existent order
  await test('❌ NEGATIVE: Activate non-existent order', async () => {
    const res = await makeRequest('POST', '/api/admin/orders/99999/activate', {}, adminToken);

    assert(res.status === 404 || res.status === 400, `Should fail, got ${res.status}`, 'negative');
  });

  // EDGE: Activate already active order
  await test('⚠️  EDGE: Activate already active order', async () => {
    const res = await makeRequest('POST', `/api/admin/orders/${data.monthlyOrderId}/activate`, {}, adminToken);

    assert(res.status === 400 || res.status === 200, `Response received (status ${res.status})`, 'edge');
  });

  // ========================================
  // Phase 4: Invoice Generation
  // ========================================
  console.log('\n🔵 PHASE 4: INVOICE GENERATION\n');

  // POSITIVE: Create invoice for active order
  await test('✅ POSITIVE: Create invoice for active order', async () => {
    const res = await makeRequest('POST', `/api/admin/billing/orders/${data.monthlyOrderId}/invoice`, {}, adminToken);

    assert(res.status === 201 || res.status === 200, `Created (status ${res.status})`, 'positive');
    assert(res.body.id, 'Invoice has ID', 'positive');
    assert(res.body.status === 'unpaid', 'Invoice is unpaid', 'positive');

    data.monthlyInvoiceId = res.body.id;
  });

  // NEGATIVE: Cannot invoice pending order
  await test('❌ NEGATIVE: Cannot invoice pending order', async () => {
    // Create pending order
    const orderRes = await makeRequest('POST', '/api/client/orders', {
      serviceId: data.serviceId,
      planId: data.planId,
      pricingId: data.monthlyPricingId,
    }, clientToken);
    const pendingOrderId = orderRes.body.id;

    const res = await makeRequest('POST', `/api/admin/billing/orders/${pendingOrderId}/invoice`, {}, adminToken);

    assert(res.status === 409 || res.status === 400, `Should fail with 409/400, got ${res.status}`, 'negative');
    console.log(`    Error: "${res.body.error}"`);
  });

  // NEGATIVE: Invoice non-existent order
  await test('❌ NEGATIVE: Invoice non-existent order', async () => {
    const res = await makeRequest('POST', '/api/admin/billing/orders/99999/invoice', {}, adminToken);

    assert(res.status === 404 || res.status === 400, `Should fail, got ${res.status}`, 'negative');
  });

  // NEGATIVE: Invoice without authentication
  await test('❌ NEGATIVE: Invoice without authentication', async () => {
    const res = await makeRequest('POST', `/api/admin/billing/orders/${data.monthlyOrderId}/invoice`, {}, null);

    assert(res.status === 401 || res.status === 403, `Should fail, got ${res.status}`, 'negative');
  });

  // POSITIVE: Get invoice details
  await test('✅ POSITIVE: Get invoice details', async () => {
    const res = await makeRequest('GET', `/api/admin/billing/invoices/${data.monthlyInvoiceId}`, null, adminToken);

    assert(res.status === 200, `Fetched (status ${res.status})`, 'positive');
    assert(res.body.id, 'Invoice has ID', 'positive');
    assert(res.body.currency === 'USD', 'Currency is correct', 'positive');
  });

  // NEGATIVE: Get non-existent invoice
  await test('❌ NEGATIVE: Get non-existent invoice', async () => {
    const res = await makeRequest('GET', '/api/admin/billing/invoices/99999', null, adminToken);

    assert(res.status === 404 || res.status === 400, `Should fail, got ${res.status}`, 'negative');
  });

  // NEGATIVE: Get invoice without authentication
  await test('❌ NEGATIVE: Get invoice without authentication', async () => {
    const res = await makeRequest('GET', `/api/admin/billing/invoices/${data.monthlyInvoiceId}`, null, null);

    assert(res.status === 401 || res.status === 403, `Should fail, got ${res.status}`, 'negative');
  });

  // ========================================
  // Phase 5: Payment Processing
  // ========================================
  console.log('\n🔵 PHASE 5: PAYMENT PROCESSING\n');

  // POSITIVE: Record payment
  await test('✅ POSITIVE: Record payment on invoice', async () => {
    const res = await makeRequest('POST', `/api/admin/billing/invoices/${data.monthlyInvoiceId}/payments`, {
      amount: 99.99,
      gateway: 'manual',
      notes: 'Test payment',
    }, adminToken);

    assert(res.status === 201 || res.status === 200, `Payment recorded (status ${res.status})`, 'positive');
  });

  // NEGATIVE: Record payment with negative amount
  await test('❌ NEGATIVE: Record payment with negative amount', async () => {
    const res = await makeRequest('POST', `/api/admin/billing/invoices/${data.monthlyInvoiceId}/payments`, {
      amount: -99.99,
      gateway: 'manual',
    }, adminToken);

    assert(res.status === 400, `Should fail with 400, got ${res.status}`, 'negative');
  });

  // NEGATIVE: Record payment without amount
  await test('❌ NEGATIVE: Record payment without amount', async () => {
    const res = await makeRequest('POST', `/api/admin/billing/invoices/${data.monthlyInvoiceId}/payments`, {
      gateway: 'manual',
    }, adminToken);

    assert(res.status === 400, `Should fail with 400, got ${res.status}`, 'negative');
  });

  // NEGATIVE: Record payment without authentication
  await test('❌ NEGATIVE: Record payment without authentication', async () => {
    const res = await makeRequest('POST', `/api/admin/billing/invoices/${data.monthlyInvoiceId}/payments`, {
      amount: 99.99,
      gateway: 'manual',
    }, null);

    assert(res.status === 401 || res.status === 403, `Should fail, got ${res.status}`, 'negative');
  });

  // EDGE: Record payment with zero amount
  await test('⚠️  EDGE: Record payment with zero amount', async () => {
    const res = await makeRequest('POST', `/api/admin/billing/invoices/${data.monthlyInvoiceId}/payments`, {
      amount: 0,
      gateway: 'manual',
    }, adminToken);

    assert(res.status === 400 || res.status === 200, `Response received (status ${res.status})`, 'edge');
  });

  // EDGE: Record payment with amount exceeding invoice total
  await test('⚠️  EDGE: Record payment exceeding invoice total', async () => {
    const res = await makeRequest('POST', `/api/admin/billing/invoices/${data.monthlyInvoiceId}/payments`, {
      amount: 9999.99,
      gateway: 'manual',
    }, adminToken);

    assert(res.status === 200 || res.status === 400, `Response received (status ${res.status})`, 'edge');
  });

  // ========================================
  // Phase 6: Permission & Access Control
  // ========================================
  console.log('\n🔵 PHASE 6: PERMISSION & ACCESS CONTROL\n');

  // NEGATIVE: Client tries to create service
  await test('❌ NEGATIVE: Client cannot create service (no permission)', async () => {
    const res = await makeRequest('POST', '/api/admin/services', {
      code: 'client-service',
      name: 'Client Service',
    }, clientToken);

    assert(res.status === 401 || res.status === 403 || res.status === 404, `Should fail, got ${res.status}`, 'negative');
  });

  // NEGATIVE: Admin cannot place client orders
  await test('❌ NEGATIVE: Admin cannot use client endpoints (potentially)', async () => {
    const res = await makeRequest('POST', '/api/client/orders', {
      serviceId: data.serviceId,
      planId: data.planId,
      pricingId: data.monthlyPricingId,
    }, adminToken);

    // This might succeed depending on implementation
    // Just check response is reasonable
    assert(res.status !== 500, `Should not have server error, got ${res.status}`, 'negative');
  });

  // ========================================
  // Phase 7: Data Validation
  // ========================================
  console.log('\n🔵 PHASE 7: DATA VALIDATION\n');

  // NEGATIVE: Service with special characters
  await test('⚠️  EDGE: Service code with special characters', async () => {
    const res = await makeRequest('POST', '/api/admin/services', {
      code: 'test@#$%^&*()',
      name: 'Special Char Service',
    }, adminToken);

    // Should either succeed or fail with 400
    assert(res.status === 201 || res.status === 400, `Response reasonable (status ${res.status})`, 'edge');
  });

  // NEGATIVE: SQL injection attempt (sanitization test)
  await test('⚠️  EDGE: SQL injection attempt in code field', async () => {
    const res = await makeRequest('POST', '/api/admin/services', {
      code: "'; DROP TABLE services; --",
      name: 'Injection Test',
    }, adminToken);

    // Should either sanitize or reject
    assert(res.status !== 500, `Should not crash (status ${res.status})`, 'edge');
  });

  // NEGATIVE: Very long strings
  await test('⚠️  EDGE: Very long service name (boundary test)', async () => {
    const res = await makeRequest('POST', '/api/admin/services', {
      code: 'long-service',
      name: 'x'.repeat(10000),
    }, adminToken);

    assert(res.status === 201 || res.status === 400 || res.status === 413, `Response reasonable (status ${res.status})`, 'edge');
  });

  // ========================================
  // Final Summary
  // ========================================
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`   TEST RESULTS - COMPREHENSIVE ANALYSIS`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const passPercentage = testCount > 0 ? ((passedTests / testCount) * 100).toFixed(1) : 0;

  console.log(`✅ Passed:        ${passedTests}`);
  console.log(`❌ Failed:        ${failedTests}`);
  console.log(`📊 Total Tests:   ${testCount}`);
  console.log(`📈 Pass Rate:     ${passPercentage}%\n`);

  console.log(`📊 Test Breakdown:`);
  console.log(`  ✅ Positive scenarios: ${positiveTests}`);
  console.log(`  ❌ Negative scenarios: ${negativeTests}`);
  console.log(`  ⚠️  Edge cases:        ${edgeTests}\n`);

  if (failedTests === 0) {
    console.log('🎉 ALL TESTS PASSED! 🎉\n');
    console.log('✅ Comprehensive Test Coverage:');
    console.log('  • Positive scenarios working');
    console.log('  • Negative scenarios handled');
    console.log('  • Edge cases managed');
    console.log('  • Authorization/Authentication');
    console.log('  • Data validation');
    console.log('  • Error handling');
    console.log('  • Status transitions');
    return 0;
  } else {
    console.log(`⚠️  ${failedTests} test(s) failed. Review logs above.\n`);
    return 1;
  }
}

// ============================================================
// Run Tests
// ============================================================

console.log(`
╔═════════════════════════════════════════════════════════╗
║                                                         ║
║   🧪 COMPREHENSIVE TEST SUITE v2.0                    ║
║   Positive + Negative + Edge Case Testing             ║
║                                                         ║
║   Server: ${API_URL.padEnd(40)}║
║   Admin:  superadmin@example.com${' '.repeat(24)}║
║   Client: ihammad317@gmail.com${' '.repeat(27)}║
║                                                         ║
╚═════════════════════════════════════════════════════════╝
`);

console.log('⏳ Connecting to server...\n');

makeRequest('GET', '/health', null, null)
  .then((res) => {
    if (res.status === 200 || res.status === 404) {
      console.log('✅ Server is responsive\n');
      return runTests();
    } else {
      throw new Error(`Unexpected response: ${res.status}`);
    }
  })
  .then((exitCode) => {
    process.exit(exitCode || 0);
  })
  .catch((err) => {
    console.error('\n❌ Connection error:', err.message);
    console.error(`\nMake sure server is running on ${API_URL}`);
    console.error('Start with: npm start\n');
    process.exit(1);
  });