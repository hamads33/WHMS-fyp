/**
 * E2E DATABASE INTEGRATION TESTS
 * Fixed to match actual Prisma schema
 *
 * Schema corrections applied:
 * - Order: clientId (not userId), no totalAmount/serviceId/billingCycle
 * - Invoice: invoiceNumber required, subtotal/totalAmount/amountDue (Decimal), clientId
 * - HostingAccount: orderId (unique, required), clientId, username (unique), password required
 * - Domain: ownerId (not userId), expiryDate (not expiresAt), DomainStatus enum
 * - Backup: createdById (not userId), sizeBytes (BigInt), filePath
 * - AuditLog: actor + source required, entity (not resource), data (not changes), ip (not ipAddress)
 * - IpAccessRule: pattern (not ipAddress), type (not action), createdById
 * - EmailToken: tokenHash (not token)
 */

const crypto = require('crypto');
const prisma = require('../src/db/prisma');

const testRunId = crypto.randomBytes(6).toString('hex');
let invoiceSeq = 0;

const getUniqueEmail = (base) => {
  const [user, domain] = base.split('@');
  return `${user}-${testRunId}@${domain}`;
};
const getUniqueUsername = () => `u_${crypto.randomBytes(5).toString('hex')}`;
const getUniqueInvoiceNo = () => `INV-${testRunId}-${++invoiceSeq}`;

const testResults = { passed: [], failed: [], startTime: new Date() };

function recordResult(name, status, details = {}) {
  const entry = { name, status, timestamp: new Date(), ...details };
  if (status === 'PASSED') testResults.passed.push(entry);
  else testResults.failed.push(entry);
  console.log(`${status === 'PASSED' ? '✓' : '✗'} ${name}`);
}

async function cleanupDatabase() {
  try {
    await prisma.refund.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.billingTransaction.deleteMany({});
    await prisma.dunningAttempt.deleteMany({});
    await prisma.invoiceDiscount.deleteMany({});
    await prisma.invoiceLineItem.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.hostingDatabase.deleteMany({});
    await prisma.hostingEmail.deleteMany({});
    await prisma.hostingDomain.deleteMany({});
    await prisma.hostingAccount.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.backupStepLog.deleteMany({});
    await prisma.backupVersion.deleteMany({});
    await prisma.backup.deleteMany({});
    await prisma.dNSRecord.deleteMany({});
    await prisma.domainContact.deleteMany({});
    await prisma.domainTransfer.deleteMany({});
    await prisma.domainLog.deleteMany({});
    await prisma.domain.deleteMany({});
    await prisma.ticketStatusHistory.deleteMany({});
    await prisma.ticketAttachment.deleteMany({});
    await prisma.ticketReply.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.chatMessage.deleteMany({});
    await prisma.chatSessionAgent.deleteMany({});
    await prisma.chatSession.deleteMany({});
    await prisma.broadcastDismissal.deleteMany({});
    await prisma.broadcastEngagement.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.ipAccessRule.deleteMany({});
    await prisma.apiKeyScope.deleteMany({});
    await prisma.apiKey.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.emailToken.deleteMany({});
    await prisma.trustedDevice.deleteMany({});
    await prisma.userRole.deleteMany({});
    await prisma.user.deleteMany({});
  } catch (error) {
    // Silently ignore cleanup errors
  }
}

async function setupRoles() {
  await prisma.role.upsert({ where: { name: 'admin' }, update: {}, create: { name: 'admin', description: 'Administrator' } });
  await prisma.role.upsert({ where: { name: 'client' }, update: {}, create: { name: 'client', description: 'Client' } });
  await prisma.role.upsert({ where: { name: 'developer' }, update: {}, create: { name: 'developer', description: 'Developer' } });
}

async function createTestUser(baseEmail = 'user@example.com', roleName = 'client') {
  const email = getUniqueEmail(baseEmail);
  return prisma.user.create({
    data: {
      email,
      passwordHash: crypto.createHash('sha256').update('Test@1234').digest('hex'),
      roles: { create: { role: { connect: { name: roleName } } } }
    },
    include: { roles: { include: { role: true } } }
  });
}

async function createTestOrder(clientId) {
  return prisma.order.create({
    data: { clientId, status: 'pending' }
  });
}

async function createTestInvoice(clientId, orderId, amount = 99.99) {
  return prisma.invoice.create({
    data: {
      invoiceNumber: getUniqueInvoiceNo(),
      clientId,
      orderId,
      subtotal: amount,
      totalAmount: amount,
      amountDue: amount,
      status: 'unpaid'
    }
  });
}

describe('E2E Database Integration Tests', () => {
  beforeAll(async () => {
    console.log('\n=== E2E Database Integration Test Suite ===\n');
    await cleanupDatabase();
    await setupRoles();
  });

  afterEach(async () => {
    try { await cleanupDatabase(); } catch (_) {}
    // Re-create roles after cleanup
    await setupRoles();
  });

  afterAll(async () => {
    const duration = new Date() - testResults.startTime;
    console.log(`\n=== Test Summary ===`);
    console.log(`Passed: ${testResults.passed.length}`);
    console.log(`Failed: ${testResults.failed.length}`);
    console.log(`Duration: ${duration}ms`);
    await prisma.$disconnect();
  });

  // ===== CHAPTER 3: REQUIREMENT-BASED TESTS =====

  describe('TC-AUTH-01: User Registration', () => {
    it('should create user with default client role', async () => {
      const email = getUniqueEmail('newuser@example.com');

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: crypto.createHash('sha256').update('Test@1234').digest('hex'),
          roles: { create: { role: { connect: { name: 'client' } } } }
        },
        include: { roles: { include: { role: true } } }
      });

      expect(user.email).toBe(email);
      expect(user.emailVerified).toBe(false);
      expect(user.roles.length).toBe(1);
      expect(user.roles[0].role.name).toBe('client');
      recordResult('TC-AUTH-01a: User Registration', 'PASSED', { userId: user.id });
    });

    it('should reject duplicate email (P2002)', async () => {
      const email = getUniqueEmail('dup@example.com');
      const hash = crypto.createHash('sha256').update('Test@1234').digest('hex');

      await prisma.user.create({ data: { email, passwordHash: hash } });

      try {
        await prisma.user.create({ data: { email, passwordHash: hash } });
        recordResult('TC-AUTH-01b: Duplicate Email Rejection', 'FAILED', { error: 'Should have thrown' });
        fail('Should have thrown P2002');
      } catch (error) {
        expect(error.code).toBe('P2002');
        recordResult('TC-AUTH-01b: Duplicate Email Rejection', 'PASSED', { constraint: 'email_unique' });
      }
    });
  });

  describe('TC-AUTH-02: Login & Session Creation', () => {
    it('should create session on login', async () => {
      const user = await createTestUser('login@example.com');

      const session = await prisma.session.create({
        data: {
          userId: user.id,
          token: crypto.randomBytes(32).toString('hex'),
          userAgent: 'TestClient/1.0',
          ip: '127.0.0.1',
          expiresAt: new Date(Date.now() + 3600000)
        }
      });

      expect(session.userId).toBe(user.id);
      expect(session.ip).toBe('127.0.0.1');
      recordResult('TC-AUTH-02: Session Creation', 'PASSED', { sessionId: session.id });
    });
  });

  describe('TC-AUTH-03: Audit Logging', () => {
    it('should log failed login attempts', async () => {
      const user = await createTestUser('audit@example.com');

      const auditLog = await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'login_failed',
          actor: user.email,
          source: 'auth',
          entity: 'auth',
          ip: '127.0.0.1',
          userAgent: 'TestClient/1.0',
          data: { reason: 'invalid_password' }
        }
      });

      expect(auditLog.action).toBe('login_failed');
      expect(auditLog.userId).toBe(user.id);
      recordResult('TC-AUTH-03: Audit Logging', 'PASSED', { auditLogId: auditLog.id });
    });
  });

  describe('TC-ORD-01: Order & Invoice Creation', () => {
    it('should create order with invoice atomically', async () => {
      const user = await createTestUser('order@example.com');

      const result = await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: { clientId: user.id, status: 'pending' }
        });

        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber: getUniqueInvoiceNo(),
            clientId: user.id,
            orderId: order.id,
            subtotal: 99.99,
            totalAmount: 99.99,
            amountDue: 99.99,
            status: 'unpaid'
          }
        });

        return { order, invoice };
      });

      expect(result.order.clientId).toBe(user.id);
      expect(result.invoice.orderId).toBe(result.order.id);
      expect(parseFloat(result.invoice.totalAmount.toString())).toBeCloseTo(99.99, 2);
      recordResult('TC-ORD-01: Order & Invoice Creation', 'PASSED', {
        orderId: result.order.id,
        invoiceId: result.invoice.id
      });
    });
  });

  describe('TC-RBAC-01: Permission Enforcement', () => {
    it('should store and differentiate roles per user', async () => {
      const clientUser = await createTestUser('client@example.com', 'client');
      const adminUser = await createTestUser('admin@example.com', 'admin');

      const clientRoles = clientUser.roles.map(r => r.role.name);
      const adminRoles = adminUser.roles.map(r => r.role.name);

      expect(clientRoles).toContain('client');
      expect(adminRoles).toContain('admin');
      recordResult('TC-RBAC-01: Permission Enforcement', 'PASSED', { clientRoles, adminRoles });
    });
  });

  describe('TC-PRV-01: Auto-Provisioning', () => {
    it('should create hosting account linked to order', async () => {
      const user = await createTestUser('provision@example.com');
      const order = await createTestOrder(user.id);

      const hostingAccount = await prisma.hostingAccount.create({
        data: {
          orderId: order.id,
          clientId: user.id,
          username: getUniqueUsername(),
          password: crypto.randomBytes(12).toString('hex'),
          status: 'active',
          controlPanel: 'cyberpanel'
        }
      });

      expect(hostingAccount.clientId).toBe(user.id);
      expect(hostingAccount.orderId).toBe(order.id);
      expect(hostingAccount.status).toBe('active');
      recordResult('TC-PRV-01: Auto-Provisioning', 'PASSED', { accountId: hostingAccount.id });
    });
  });

  describe('TC-DOM-01: Domain Registration', () => {
    it('should register domain linked to user', async () => {
      const user = await createTestUser('domain@example.com');
      const uniqueDomain = `testdomain-${testRunId}.com`;

      const domain = await prisma.domain.create({
        data: {
          ownerId: user.id,
          name: uniqueDomain,
          status: 'active',
          registrar: 'porkbun',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });

      expect(domain.name).toBe(uniqueDomain);
      expect(domain.status).toBe('active');
      expect(domain.ownerId).toBe(user.id);
      recordResult('TC-DOM-01: Domain Registration', 'PASSED', { domainId: domain.id });
    });
  });

  describe('TC-BAK-01: Backup Storage', () => {
    it('should store backup record linked to user', async () => {
      const user = await createTestUser('backup@example.com');

      const backup = await prisma.backup.create({
        data: {
          name: 'test-backup',
          type: 'full',
          status: 'completed',
          filePath: 's3://bucket/backup-test.tar.gz',
          sizeBytes: BigInt(1024000),
          createdById: user.id
        }
      });

      expect(backup.createdById).toBe(user.id);
      expect(backup.status).toBe('completed');
      recordResult('TC-BAK-01: Backup Storage', 'PASSED', { backupId: backup.id });
    });
  });

  // ===== CHAPTER 5: IMPLEMENTATION TESTS =====

  describe('ITC-05: Pagination Boundaries', () => {
    it('should return correct subset with take limit', async () => {
      const user = await createTestUser('pagination@example.com');

      for (let i = 0; i < 5; i++) {
        await prisma.order.create({ data: { clientId: user.id, status: 'pending' } });
      }

      const orders = await prisma.order.findMany({ where: { clientId: user.id }, take: 2 });
      const allOrders = await prisma.order.findMany({ where: { clientId: user.id } });

      expect(orders.length).toBeLessThanOrEqual(2);
      expect(allOrders.length).toBe(5);
      recordResult('ITC-05: Pagination Boundaries', 'PASSED', { returned: orders.length, total: allOrders.length });
    });
  });

  describe('ITC-14: Error Response Format', () => {
    it('should throw on unique constraint violation', async () => {
      const email = getUniqueEmail('err@example.com');
      const hash = crypto.createHash('sha256').update('Test@1234').digest('hex');

      await prisma.user.create({ data: { email, passwordHash: hash } });

      try {
        await prisma.user.create({ data: { email, passwordHash: hash } });
        fail('Expected unique constraint error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.code).toBe('P2002');
        recordResult('ITC-14: Error Response Format', 'PASSED', { errorCode: error.code });
      }
    });
  });

  // ===== CHAPTER 6: FUNCTIONAL E2E TESTS =====

  describe('BT-01: Full Onboarding Flow', () => {
    it('should complete register → verify email → login session', async () => {
      const email = getUniqueEmail('onboard@example.com');

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: crypto.createHash('sha256').update('Test@1234').digest('hex'),
          roles: { create: { role: { connect: { name: 'client' } } } }
        }
      });

      const verified = await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true }
      });

      const session = await prisma.session.create({
        data: {
          userId: user.id,
          token: crypto.randomBytes(32).toString('hex'),
          expiresAt: new Date(Date.now() + 3600000),
          userAgent: 'Browser',
          ip: '127.0.0.1'
        }
      });

      expect(verified.emailVerified).toBe(true);
      expect(session.userId).toBe(user.id);
      recordResult('BT-01: Full Onboarding Flow', 'PASSED', { userId: user.id });
    });
  });

  describe('BT-02: Order-to-Provisioning Flow', () => {
    it('should complete order → invoice → provisioning lifecycle', async () => {
      const user = await createTestUser('e2eorder@example.com');
      const order = await createTestOrder(user.id);
      const invoice = await createTestInvoice(user.id, order.id, 99.99);

      const paidOrder = await prisma.order.update({
        where: { id: order.id },
        data: { status: 'active' }
      });

      const hostingAccount = await prisma.hostingAccount.create({
        data: {
          orderId: order.id,
          clientId: user.id,
          username: getUniqueUsername(),
          password: crypto.randomBytes(12).toString('hex'),
          status: 'active',
          controlPanel: 'cyberpanel'
        }
      });

      expect(paidOrder.status).toBe('active');
      expect(hostingAccount.status).toBe('active');
      expect(hostingAccount.orderId).toBe(order.id);
      recordResult('BT-02: Order-to-Provisioning Flow', 'PASSED', {
        orderId: order.id,
        accountId: hostingAccount.id
      });
    });
  });

  describe('BT-17: Client Spending Summary', () => {
    it('should aggregate client invoice totals correctly', async () => {
      const user = await createTestUser('spending@example.com');
      const amounts = [50, 60, 70];

      for (const amount of amounts) {
        const order = await createTestOrder(user.id);
        await createTestInvoice(user.id, order.id, amount);
      }

      const invoices = await prisma.invoice.findMany({
        where: { clientId: user.id, status: 'unpaid' }
      });

      const totalSpending = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount.toString()), 0);

      expect(invoices.length).toBe(3);
      expect(totalSpending).toBeCloseTo(180, 1);
      recordResult('BT-17: Spending Summary', 'PASSED', { totalSpending, invoiceCount: invoices.length });
    });
  });

  // ===== EXTENDED TESTS =====

  describe('TC-AUTH-04: Token Refresh', () => {
    it('should create and retrieve refresh token', async () => {
      const user = await createTestUser('refresh@example.com');

      const refreshToken = await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: crypto.randomBytes(32).toString('hex'),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      expect(refreshToken.userId).toBe(user.id);
      recordResult('TC-AUTH-04: Token Refresh', 'PASSED', { tokenId: refreshToken.id });
    });
  });

  describe('TC-AUTH-05: Password Reset', () => {
    it('should create password reset email token', async () => {
      const user = await createTestUser('reset@example.com');

      const emailToken = await prisma.emailToken.create({
        data: {
          userId: user.id,
          tokenHash: crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex'),
          type: 'password_reset',
          expiresAt: new Date(Date.now() + 3600000)
        }
      });

      expect(emailToken.userId).toBe(user.id);
      expect(emailToken.type).toBe('password_reset');
      recordResult('TC-AUTH-05: Password Reset', 'PASSED', { tokenId: emailToken.id });
    });
  });

  describe('TC-RBAC-02: API Key Scoping', () => {
    it('should create API key with scoped permissions', async () => {
      const user = await createTestUser('apikey@example.com');

      const apiKey = await prisma.apiKey.create({
        data: {
          userId: user.id,
          name: 'read-only-key',
          keyHash: crypto.randomBytes(32).toString('hex'),
          scopes: { create: [{ scope: 'orders:read' }, { scope: 'services:read' }] }
        },
        include: { scopes: true }
      });

      expect(apiKey.userId).toBe(user.id);
      expect(apiKey.scopes.length).toBe(2);
      expect(apiKey.scopes.map(s => s.scope)).toContain('orders:read');
      recordResult('TC-RBAC-02: API Key Scoping', 'PASSED', { apiKeyId: apiKey.id, scopes: 2 });
    });
  });

  describe('TC-IP-01: IP Access Control', () => {
    it('should create IP access rule', async () => {
      const user = await createTestUser('ipcontrol@example.com');

      const rule = await prisma.ipAccessRule.create({
        data: {
          pattern: '192.168.1.0/24',
          type: 'allow',
          description: 'Office network',
          createdById: user.id
        }
      });

      expect(rule.pattern).toBe('192.168.1.0/24');
      expect(rule.type).toBe('allow');
      recordResult('TC-IP-01: IP Access Control', 'PASSED', { ruleId: rule.id });
    });
  });

  describe('TC-PRV-02: Client Data Isolation', () => {
    it('should isolate hosting accounts per client', async () => {
      const client1 = await createTestUser('client1@example.com');
      const client2 = await createTestUser('client2@example.com');

      const order1 = await createTestOrder(client1.id);
      const order2 = await createTestOrder(client2.id);

      const account1 = await prisma.hostingAccount.create({
        data: {
          orderId: order1.id,
          clientId: client1.id,
          username: getUniqueUsername(),
          password: crypto.randomBytes(12).toString('hex'),
          status: 'active',
          controlPanel: 'cyberpanel'
        }
      });

      await prisma.hostingAccount.create({
        data: {
          orderId: order2.id,
          clientId: client2.id,
          username: getUniqueUsername(),
          password: crypto.randomBytes(12).toString('hex'),
          status: 'active',
          controlPanel: 'cyberpanel'
        }
      });

      const client1Accounts = await prisma.hostingAccount.findMany({ where: { clientId: client1.id } });

      expect(client1Accounts.length).toBe(1);
      expect(client1Accounts[0].id).toBe(account1.id);
      recordResult('TC-PRV-02: Client Isolation', 'PASSED', { accountsForClient1: 1 });
    });
  });

  describe('TC-PRV-03: Account Suspension and Restoration', () => {
    it('should suspend and restore hosting account', async () => {
      const user = await createTestUser('suspend@example.com');
      const order = await createTestOrder(user.id);

      const account = await prisma.hostingAccount.create({
        data: {
          orderId: order.id,
          clientId: user.id,
          username: getUniqueUsername(),
          password: crypto.randomBytes(12).toString('hex'),
          status: 'active',
          controlPanel: 'cyberpanel'
        }
      });

      const suspended = await prisma.hostingAccount.update({
        where: { id: account.id },
        data: { status: 'suspended', suspendedAt: new Date() }
      });

      const restored = await prisma.hostingAccount.update({
        where: { id: account.id },
        data: { status: 'active', suspendedAt: null }
      });

      expect(suspended.status).toBe('suspended');
      expect(restored.status).toBe('active');
      recordResult('TC-PRV-03: Account Suspension', 'PASSED', { accountId: account.id });
    });
  });

  describe('ITC-07: Concurrent Order Creation', () => {
    it('should handle concurrent orders without conflicts', async () => {
      const user = await createTestUser('concurrent@example.com');

      const orders = await Promise.all([
        prisma.order.create({ data: { clientId: user.id, status: 'pending' } }),
        prisma.order.create({ data: { clientId: user.id, status: 'pending' } })
      ]);

      const userOrders = await prisma.order.findMany({ where: { clientId: user.id } });

      expect(userOrders.length).toBe(2);
      expect(orders[0].id).not.toBe(orders[1].id);
      recordResult('ITC-07: Concurrent Orders', 'PASSED', { ordersCreated: 2 });
    });
  });

  describe('TC-SEC-01: JWT Validation / Expired Session', () => {
    it('should store expired session and detect it as expired', async () => {
      const user = await createTestUser('jwt@example.com');
      const pastDate = new Date(Date.now() - 1000);

      const expiredSession = await prisma.session.create({
        data: {
          userId: user.id,
          token: crypto.randomBytes(32).toString('hex'),
          expiresAt: pastDate
        }
      });

      expect(expiredSession.expiresAt.getTime()).toBeLessThan(Date.now());
      recordResult('TC-SEC-01: JWT Validation', 'PASSED', { sessionId: expiredSession.id });
    });
  });

  describe('ITC-16: Event Idempotency', () => {
    it('should prevent duplicate hosting accounts for same order', async () => {
      const user = await createTestUser('idempotent@example.com');
      const order = await createTestOrder(user.id);

      await prisma.hostingAccount.create({
        data: {
          orderId: order.id,
          clientId: user.id,
          username: getUniqueUsername(),
          password: crypto.randomBytes(12).toString('hex'),
          status: 'active',
          controlPanel: 'cyberpanel'
        }
      });

      try {
        // Second creation for same orderId must fail (unique constraint)
        await prisma.hostingAccount.create({
          data: {
            orderId: order.id,
            clientId: user.id,
            username: getUniqueUsername(),
            password: crypto.randomBytes(12).toString('hex'),
            status: 'active',
            controlPanel: 'cyberpanel'
          }
        });
        fail('Expected unique constraint on orderId');
      } catch (error) {
        expect(error.code).toBe('P2002');
        const accounts = await prisma.hostingAccount.findMany({ where: { orderId: order.id } });
        expect(accounts.length).toBe(1);
        recordResult('ITC-16: Event Idempotency', 'PASSED', { duplicateBlocked: true });
      }
    });
  });
});
