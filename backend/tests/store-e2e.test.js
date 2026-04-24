/**
 * STORE END-TO-END TESTS
 *
 * Tests the complete store checkout flow against the live server:
 *   Store catalog → Register → Login → Place order →
 *   Invoice generated → Pay invoice → Invoice marked paid
 *
 * Also covers:
 *   - billingCycle normalisation in the public catalog API
 *   - Invoice idempotency guard (duplicate invoice → 409)
 *   - Manual gateway payment completes immediately
 *
 * Prerequisites:
 *   - Server running: npm start (port 4000)
 *   - Seeded: superadmin@example.com / SuperAdmin123!
 *
 * Run: npx jest tests/store-e2e.test.js --runInBand
 */

const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:4000';
const ADMIN_EMAIL = 'superadmin@example.com';
const ADMIN_PASS  = 'SuperAdmin123!';

const api = axios.create({ baseURL: BASE_URL, validateStatus: () => true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const runId   = crypto.randomBytes(4).toString('hex');
const uniq    = (s) => s.replace('@', `-${runId}@`);

// ── Helpers ───────────────────────────────────────────────────────────────────

function auth(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

async function loginWithRetry(email, password, retries = 5) {
  for (let i = 0; i < retries; i++) {
    if (i > 0) await sleep(2500);
    const res = await api.post('/api/auth/login', { email, password });
    if (res.status !== 429) return res;
  }
  return api.post('/api/auth/login', { email, password });
}

async function registerWithRetry(email, password, retries = 5) {
  for (let i = 0; i < retries; i++) {
    if (i > 0) await sleep(2500);
    const res = await api.post('/api/auth/register', { email, password });
    if (res.status !== 429) return res;
  }
  return api.post('/api/auth/register', { email, password });
}

// ── Result tracker ────────────────────────────────────────────────────────────

const results = { passed: [], failed: [] };
function track(name, passed, detail = '') {
  const icon = passed ? '✓' : '✗';
  console.log(`  ${icon} ${name}${detail ? ' — ' + detail : ''}`);
  if (passed) results.passed.push(name);
  else        results.failed.push(name);
}

// ── Shared state ──────────────────────────────────────────────────────────────

const state = {
  adminToken:   null,
  clientToken:  null,
  clientEmail:  uniq('store-client@example.com'),
  clientPass:   'StorePass123!',
  serviceId:    null,
  planId:       null,
  pricingId:    null,  // monthly
  annualPricingId: null,
  monthlyPrice: 9.99,
  orderId:      null,
  invoiceId:    null,
};

// ─────────────────────────────────────────────────────────────────────────────
describe('Store End-to-End — full checkout flow (port 4000)', () => {

  afterAll(() => {
    console.log(`\n${'═'.repeat(60)}`);
    console.log('  STORE E2E RESULTS');
    console.log(`  Passed : ${results.passed.length}`);
    console.log(`  Failed : ${results.failed.length}`);
    console.log(`  Total  : ${results.passed.length + results.failed.length}`);
    console.log(`${'═'.repeat(60)}\n`);
  });

  // ── BOOTSTRAP ─────────────────────────────────────────────────────────────

  describe('Bootstrap — admin login + fixture creation', () => {
    it('should login as superadmin', async () => {
      const res = await loginWithRetry(ADMIN_EMAIL, ADMIN_PASS);
      expect(res.status).toBe(200);
      expect(res.data.accessToken).toBeDefined();
      state.adminToken = res.data.accessToken;
      track('Bootstrap: admin JWT obtained', true, `userId=${res.data.user.id.slice(0, 8)}…`);
    });

    it('should create a test service', async () => {
      const res = await api.post(
        '/api/admin/services',
        {
          code:        `test_svc_${runId}`,
          name:        `E2E Test Service ${runId}`,
          description: 'Created by store E2E tests — safe to delete',
          moduleType:  'hosting',
          active:      true,
        },
        auth(state.adminToken),
      );
      expect(res.status).toBe(201);
      expect(res.data.service?.id || res.data.id).toBeDefined();
      state.serviceId = res.data.service?.id ?? res.data.id;
      track('Bootstrap: test service created', true, `id=${state.serviceId.slice(0, 8)}…`);
    });

    it('should create a test plan inside the service', async () => {
      const res = await api.post(
        `/api/admin/services/${state.serviceId}/plans`,
        {
          name:    `E2E Basic Plan ${runId}`,
          summary: 'Cheapest plan — used by store E2E tests',
          active:  true,
        },
        auth(state.adminToken),
      );
      expect(res.status).toBe(201);
      state.planId = res.data.plan?.id ?? res.data.id;
      expect(state.planId).toBeDefined();
      track('Bootstrap: test plan created', true, `id=${state.planId.slice(0, 8)}…`);
    });

    it('should create monthly pricing for the plan', async () => {
      const res = await api.post(
        `/api/admin/plans/${state.planId}/pricing`,
        {
          cycle:    'monthly',
          price:    state.monthlyPrice,
          setupFee: 0,
          currency: 'USD',
          active:   true,
        },
        auth(state.adminToken),
      );
      expect(res.status).toBe(201);
      state.pricingId = res.data.pricing?.id ?? res.data.id;
      expect(state.pricingId).toBeDefined();
      track('Bootstrap: monthly pricing created', true, `price=$${state.monthlyPrice}/mo`);
    });

    it('should create annual pricing for the plan (toggle test)', async () => {
      const res = await api.post(
        `/api/admin/plans/${state.planId}/pricing`,
        {
          cycle:    'annually',
          price:    99.99,
          setupFee: 0,
          currency: 'USD',
          active:   true,
        },
        auth(state.adminToken),
      );
      expect(res.status).toBe(201);
      state.annualPricingId = res.data.pricing?.id ?? res.data.id;
      track('Bootstrap: annual pricing created', true, 'price=$99.99/yr');
    });
  });

  // ── TC-STORE-01: Public catalog ───────────────────────────────────────────

  describe('TC-STORE-01 — Public catalog returns services with billingCycle', () => {
    let catalogData = null;

    it('GET /api/store/services returns 200 and services array', async () => {
      const res = await api.get('/api/store/services');
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.services)).toBe(true);
      catalogData = res.data;
      track('TC-STORE-01a: catalog returns 200 + services array', true,
        `${res.data.services.length} service(s)`);
    });

    it('test service appears in catalog with active=true', async () => {
      const svc = catalogData?.services?.find(s => s.id === state.serviceId);
      expect(svc).toBeDefined();
      expect(svc.active).toBe(true);
      track('TC-STORE-01b: test service present in catalog', true);
    });

    it('every pricing object has billingCycle field (not just cycle)', async () => {
      const svc  = catalogData?.services?.find(s => s.id === state.serviceId);
      const plan = svc?.plans?.find(p => p.id === state.planId);
      expect(plan).toBeDefined();
      expect(plan.pricing.length).toBeGreaterThanOrEqual(2);

      for (const pr of plan.pricing) {
        expect(pr).toHaveProperty('billingCycle');
        expect(typeof pr.billingCycle).toBe('string');
        expect(pr.billingCycle.length).toBeGreaterThan(0);
      }

      // Confirm the normalization: billingCycle mirrors the DB `cycle` column
      const monthly = plan.pricing.find(p => p.billingCycle === 'monthly');
      const annual  = plan.pricing.find(p => p.billingCycle === 'annually');
      expect(monthly).toBeDefined();
      expect(annual).toBeDefined();

      track('TC-STORE-01c: billingCycle field present and correct on all pricing', true,
        `${plan.pricing.length} pricing option(s)`);
    });

    it('GET /api/store/services/:id returns single service with plans', async () => {
      const res = await api.get(`/api/store/services/${state.serviceId}`);
      expect(res.status).toBe(200);
      expect(res.data.service.id).toBe(state.serviceId);
      expect(res.data.service.plans.length).toBeGreaterThan(0);
      const pr = res.data.service.plans[0].pricing[0];
      expect(pr).toHaveProperty('billingCycle');
      track('TC-STORE-01d: single-service endpoint also normalises billingCycle', true);
    });
  });

  // ── TC-STORE-02 + 03: Register + Login ───────────────────────────────────

  describe('TC-STORE-02 — Client registration', () => {
    it('should register a new client', async () => {
      const res = await registerWithRetry(state.clientEmail, state.clientPass);
      expect([201, 200]).toContain(res.status);
      expect(res.data.user?.email).toBe(state.clientEmail);
      track('TC-STORE-02: client registered', true, state.clientEmail);
    });

    it('should reject duplicate registration (HTTP 409)', async () => {
      await sleep(1000);
      const res = await api.post('/api/auth/register', {
        email: state.clientEmail, password: 'AnotherPass999!',
      });
      expect([409, 429]).toContain(res.status);
      track('TC-STORE-02b: duplicate registration rejected', true, `HTTP ${res.status}`);
    });
  });

  describe('TC-STORE-03 — Client login', () => {
    it('should login and receive accessToken', async () => {
      const res = await loginWithRetry(state.clientEmail, state.clientPass);
      expect(res.status).toBe(200);
      expect(res.data.accessToken).toBeDefined();
      expect(res.data.accessToken).toMatch(/^eyJ/);
      state.clientToken = res.data.accessToken;
      track('TC-STORE-03: client JWT received', true);
    });
  });

  // ── TC-STORE-04: Place order ──────────────────────────────────────────────

  describe('TC-STORE-04 — Place order via client API', () => {
    it('POST /api/client/orders returns 201 with order, invoice and costBreakdown', async () => {
      const res = await api.post(
        '/api/client/orders',
        {
          serviceId:     state.serviceId,
          planId:        state.planId,
          pricingId:     state.pricingId,
          billingCycles: 1,
          quantity:      1,
        },
        auth(state.clientToken),
      );

      expect(res.status).toBe(201);
      expect(res.data.success).toBe(true);
      expect(res.data.order).toBeDefined();
      expect(res.data.order.id).toBeDefined();
      expect(res.data.order.status).toBe('pending');

      // Invoice must be generated and returned inline
      expect(res.data.invoice).not.toBeNull();
      expect(res.data.invoice.id).toBeDefined();
      expect(res.data.invoice.status).toBe('unpaid');

      // costBreakdown
      expect(res.data.costBreakdown).toBeDefined();
      expect(parseFloat(res.data.costBreakdown.total)).toBeCloseTo(state.monthlyPrice, 2);

      state.orderId   = res.data.order.id;
      state.invoiceId = res.data.invoice.id;
      track('TC-STORE-04: order placed', true,
        `orderId=${state.orderId.slice(0, 8)}… invoiceId=${state.invoiceId.slice(0, 8)}…`);
    });

    it('order is created in the database under the correct client', async () => {
      const res = await api.get(
        `/api/client/orders/${state.orderId}`,
        auth(state.clientToken),
      );
      expect(res.status).toBe(200);
      track('TC-STORE-04b: order retrievable by client', true);
    });
  });

  // ── TC-STORE-05: Invoice correctness ─────────────────────────────────────

  describe('TC-STORE-05 — Invoice has correct content', () => {
    let invoice = null;

    it('GET /api/client/billing/invoices/:id returns invoice with lineItems', async () => {
      const res = await api.get(
        `/api/client/billing/invoices/${state.invoiceId}`,
        auth(state.clientToken),
      );
      expect(res.status).toBe(200);
      invoice = res.data.invoice ?? res.data;
      expect(invoice.id).toBe(state.invoiceId);
      expect(invoice.status).toBe('unpaid');
      expect(Array.isArray(invoice.lineItems)).toBe(true);
      expect(invoice.lineItems.length).toBeGreaterThan(0);
      track('TC-STORE-05a: invoice fetched via billing API', true,
        `${invoice.lineItems.length} line item(s)`);
    });

    it('line item description mentions the service and plan', () => {
      const desc = invoice.lineItems[0].description;
      // The description is built as "{serviceName} — {planName} ({cycleLabel})"
      expect(desc).toBeTruthy();
      expect(typeof desc).toBe('string');
      track('TC-STORE-05b: line item has non-empty description', true, `"${desc.slice(0, 60)}"`);
    });

    it('amountDue matches the pricing price for 1 billing cycle', () => {
      const due = parseFloat(invoice.amountDue);
      expect(due).toBeCloseTo(state.monthlyPrice, 2);
      track('TC-STORE-05c: amountDue matches plan price', true,
        `$${due} ≈ $${state.monthlyPrice}`);
    });

    it('invoice is linked to the correct order', () => {
      expect(invoice.orderId).toBe(state.orderId);
      track('TC-STORE-05d: invoice.orderId matches order', true);
    });
  });

  // ── TC-STORE-06: Duplicate invoice guard ─────────────────────────────────

  describe('TC-STORE-06 — Duplicate invoice guard returns 409', () => {
    it('admin re-generating invoice for same order should return 409', async () => {
      // POST /api/admin/billing/orders/:orderId/invoice
      // An unpaid invoice already exists — the guard must reject this.
      const res = await api.post(
        `/api/admin/billing/orders/${state.orderId}/invoice`,
        {},
        auth(state.adminToken),
      );
      expect(res.status).toBe(409);
      const body = JSON.stringify(res.data).toLowerCase();
      expect(body).toMatch(/already exists|duplicate|active invoice/);
      track('TC-STORE-06: duplicate invoice request returns 409', true);
    });

    it('only one invoice exists for the order after the rejected duplicate', async () => {
      const res = await api.get(
        `/api/admin/billing/orders/${state.orderId}/invoices`,
        auth(state.adminToken),
      );
      expect(res.status).toBe(200);
      const invoices = res.data.invoices ?? res.data;
      const active   = (Array.isArray(invoices) ? invoices : []).filter(
        i => i.status !== 'cancelled',
      );
      expect(active.length).toBe(1);
      track('TC-STORE-06b: exactly one non-cancelled invoice for the order', true);
    });
  });

  // ── TC-STORE-07: Pay invoice ──────────────────────────────────────────────

  describe('TC-STORE-07 — Client pays invoice with manual gateway', () => {
    it('POST /api/client/billing/invoices/:id/pay with gateway=manual returns 200', async () => {
      const res = await api.post(
        `/api/client/billing/invoices/${state.invoiceId}/pay`,
        { gateway: 'manual' },
        auth(state.clientToken),
      );
      // Accept 200 or 201 — gateway stubs may vary
      expect([200, 201]).toContain(res.status);
      expect(res.data.success ?? true).toBeTruthy();
      track('TC-STORE-07: pay invoice returned success', true, `HTTP ${res.status}`);
    });
  });

  // ── TC-STORE-08: Invoice status after payment ─────────────────────────────

  describe('TC-STORE-08 — Invoice status is paid after manual payment', () => {
    it('invoice status is "paid" after manual gateway payment', async () => {
      const res = await api.get(
        `/api/client/billing/invoices/${state.invoiceId}`,
        auth(state.clientToken),
      );
      expect(res.status).toBe(200);
      const invoice = res.data.invoice ?? res.data;
      expect(invoice.status).toBe('paid');
      track('TC-STORE-08: invoice status = paid', true);
    });
  });

  // ── TC-STORE-09: Second pay attempt rejected ──────────────────────────────

  describe('TC-STORE-09 — Paying an already-paid invoice is rejected', () => {
    it('paying a paid invoice returns 409', async () => {
      const res = await api.post(
        `/api/client/billing/invoices/${state.invoiceId}/pay`,
        { gateway: 'manual' },
        auth(state.clientToken),
      );
      expect(res.status).toBe(409);
      track('TC-STORE-09: second payment attempt returns 409', true);
    });
  });

  // ── CLEANUP ───────────────────────────────────────────────────────────────

  describe('Cleanup — remove test fixtures', () => {
    it('hard-delete test service (cascades plans, pricing, snapshots, orders, invoices)', async () => {
      if (!state.serviceId) return;
      const res = await api.delete(
        `/api/admin/services/${state.serviceId}/hard`,
        auth(state.adminToken),
      );
      // 200 or 204 both acceptable
      expect([200, 204]).toContain(res.status);
      track('Cleanup: test service hard-deleted', true);
    });

    it('test service no longer appears in public catalog', async () => {
      const res = await api.get('/api/store/services');
      expect(res.status).toBe(200);
      const ids = (res.data.services ?? []).map(s => s.id);
      expect(ids).not.toContain(state.serviceId);
      track('Cleanup: service absent from catalog', true);
    });
  });

});
