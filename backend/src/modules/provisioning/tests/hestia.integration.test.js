/**
 * HestiaCP Integration Tests
 * Path: src/modules/provisioning/tests/hestia.integration.test.js
 *
 * Run tests with: npm test -- hestia.integration.test.js
 *
 * Prerequisites:
 * - HestiaCP running on HESTIA_HOST:HESTIA_PORT
 * - HESTIA_TOKEN configured in .env.local
 * - Redis running for BullMQ
 */

const hestiaDriver = require('../drivers/hestia.driver');
const provisioningService = require('../services/provisioning.service');
const prisma = require('../../../db/prisma');

describe('HestiaCP Integration', () => {
  const testOrderId = 'test-order-' + Date.now();
  const testUsername = 'test-user-' + Math.random().toString(36).substring(7);
  const testDomain = `test-${Date.now()}.local`;
  const testEmail = `test-${Date.now()}@example.com`;

  // ============================================================
  // UNIT TESTS: HestiaCP Driver
  // ============================================================

  describe('HestiaCP Driver', () => {
    test('should be configured', () => {
      expect(hestiaDriver.configured).toBe(true);
    });

    test('should validate username', () => {
      // Valid usernames
      expect(() => hestiaDriver._validateUsername('test')).not.toThrow();
      expect(() => hestiaDriver._validateUsername('test-user')).not.toThrow();

      // Invalid usernames
      expect(() => hestiaDriver._validateUsername('ab')).toThrow(); // Too short
      expect(() => hestiaDriver._validateUsername('abcdefghijklmnopqrst')).toThrow(); // Too long
      expect(() => hestiaDriver._validateUsername('test@user')).toThrow(); // Invalid chars
    });

    test('should validate domain', () => {
      // Valid domains
      expect(() => hestiaDriver._validateDomain('example.com')).not.toThrow();
      expect(() => hestiaDriver._validateDomain('sub.example.co.uk')).not.toThrow();

      // Invalid domains
      expect(() => hestiaDriver._validateDomain('invalid')).toThrow();
      expect(() => hestiaDriver._validateDomain('.com')).toThrow();
    });

    test('should generate valid MD5 hash', () => {
      const hash = hestiaDriver._generateHash(123456789);
      expect(hash).toMatch(/^[a-f0-9]{32}$/); // MD5 is 32 hex chars
    });

    test('should handle parse response correctly', () => {
      const okResponse = 'ok|success';
      const result = hestiaDriver._parseResponse(okResponse);
      expect(result.success).toBe(true);

      const errorResponse = 'error|User already exists';
      const errorResult = hestiaDriver._parseResponse(errorResponse);
      expect(errorResult.error).toBe('User already exists');
    });
  });

  // ============================================================
  // INTEGRATION TESTS: HestiaCP API Calls
  // ============================================================

  describe('HestiaCP API Calls', () => {
    test('should test connection', async () => {
      const result = await hestiaDriver.testConnection();
      expect(result.connected).toBe(true);
      expect(result.success).toBe(true);
    });

    test('should create user', async () => {
      const result = await hestiaDriver.createUser({
        username: testUsername,
        password: 'TestPass123!@#',
        email: testEmail,
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result.success).toBe(true);
      expect(result.username).toBe(testUsername);
    });

    test('should list users', async () => {
      const result = await hestiaDriver.listUsers();
      expect(result.success).toBe(true);
      expect(Array.isArray(result.users)).toBe(true);
    });

    test('should get user stats', async () => {
      const result = await hestiaDriver.getUserStats(testUsername);
      expect(result.success).toBe(true);
      expect(result.username).toBe(testUsername);
    });

    test('should create domain', async () => {
      const result = await hestiaDriver.createDomain(testUsername, {
        domain: testDomain,
        ip: 'shared',
      });

      expect(result.success).toBe(true);
      expect(result.domain).toBe(testDomain);
    });

    test('should create email', async () => {
      const result = await hestiaDriver.createMail(testUsername, testDomain, {
        account: 'info',
        password: 'EmailPass123!',
        quota: 100,
      });

      expect(result.success).toBe(true);
      expect(result.email).toBe(`info@${testDomain}`);
    });

    test('should create database', async () => {
      const result = await hestiaDriver.createDatabase(testUsername, {
        name: 'testdb',
        user: 'testuser',
        password: 'DBPass123!',
        type: 'mysql',
      });

      expect(result.success).toBe(true);
      expect(result.database).toBe('testdb');
    });

    test('should suspend user', async () => {
      const result = await hestiaDriver.suspendUser(testUsername);
      expect(result.success).toBe(true);
      expect(result.status).toBe('suspended');
    });

    test('should unsuspend user', async () => {
      const result = await hestiaDriver.unsuspendUser(testUsername);
      expect(result.success).toBe(true);
      expect(result.status).toBe('unsuspended');
    });

    test('should delete email', async () => {
      const result = await hestiaDriver.deleteMail(testUsername, testDomain, 'info');
      expect(result.success).toBe(true);
    });

    test('should delete database', async () => {
      const result = await hestiaDriver.deleteDatabase(testUsername, 'testdb');
      expect(result.success).toBe(true);
    });

    test('should delete domain', async () => {
      const result = await hestiaDriver.deleteDomain(testUsername, testDomain);
      expect(result.success).toBe(true);
    });

    test('should delete user', async () => {
      const result = await hestiaDriver.deleteUser(testUsername);
      expect(result.success).toBe(true);
    });
  });

  // ============================================================
  // SERVICE TESTS: Provisioning Service
  // ============================================================

  describe('Provisioning Service', () => {
    let createdAccountId;

    test('should provision account from order', async () => {
      // Create test order first
      const testOrder = await prisma.order.create({
        data: {
          id: testOrderId,
          clientId: 'test-client-id',
          serviceId: 'test-service-id',
          quantity: 1,
          status: 'active',
          total: 100,
          invoice: {
            create: {
              amount: 100,
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              status: 'pending',
            },
          },
          snapshot: {
            create: {
              plan: {
                name: 'Standard',
                controlPanel: 'hestia',
              },
            },
          },
          client: {
            connect: {
              id: 'test-client-id',
            },
          },
        },
      });

      const account = await provisioningService.provisionAccount(testOrderId);

      expect(account).toBeDefined();
      expect(account.orderId).toBe(testOrderId);
      expect(account.controlPanel).toBe('hestia');
      expect(account.status).toBe('active');

      createdAccountId = account.id;
    });

    test('should get account by order ID', async () => {
      const account = await provisioningService.getAccountByOrderId(testOrderId);
      expect(account).toBeDefined();
      expect(account.orderId).toBe(testOrderId);
    });

    test('should get account by username', async () => {
      const account = await provisioningService.getAccountByUsername(
        'test-client-id-' + testOrderId
      );
      expect(account).toBeDefined();
    });

    test('should sync account stats', async () => {
      const account = await provisioningService.getAccountByOrderId(testOrderId);
      const stats = await provisioningService.syncAccountStats(account.username);

      expect(stats.success).toBe(true);
      expect(stats.username).toBeDefined();
    });

    test('should provision domain', async () => {
      const account = await provisioningService.getAccountByOrderId(testOrderId);
      const domain = await provisioningService.provisionDomain(account.username, {
        domain: 'prov-test-' + Date.now() + '.local',
      });

      expect(domain).toBeDefined();
      expect(domain.status).toBe('active');
    });

    test('should provision email', async () => {
      const account = await provisioningService.getAccountByOrderId(testOrderId);
      const email = await provisioningService.provisionEmail(
        account.username,
        'prov-test-' + Date.now() + '.local',
        {
          account: 'info',
          quota: 100,
        }
      );

      expect(email).toBeDefined();
      expect(email.status).toBe('active');
    });

    test('should suspend account', async () => {
      const account = await provisioningService.suspendAccount(
        testOrderId,
        'non-payment'
      );

      expect(account.status).toBe('suspended');
      expect(account.suspendReason).toBe('non-payment');
    });

    test('should unsuspend account', async () => {
      const account = await provisioningService.unsuspendAccount(testOrderId);

      expect(account.status).toBe('active');
      expect(account.suspendReason).toBeNull();
    });

    test('should deprovision account', async () => {
      const account = await provisioningService.deprovisionAccount(testOrderId);

      expect(account.status).toBe('deleted');
      expect(account.deletedAt).toBeDefined();
    });
  });

  // ============================================================
  // PERFORMANCE TESTS
  // ============================================================

  describe('Performance', () => {
    test('should create user in < 5 seconds', async () => {
      const start = Date.now();

      await hestiaDriver.createUser({
        username: 'perf-' + Math.random().toString(36).substring(7),
        password: 'PerfPass123!',
        email: 'perf@example.com',
      });

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000);
    });

    test('should list users in < 2 seconds', async () => {
      const start = Date.now();

      await hestiaDriver.listUsers();

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(2000);
    });
  });

  // ============================================================
  // ERROR HANDLING TESTS
  // ============================================================

  describe('Error Handling', () => {
    test('should handle invalid username', async () => {
      await expect(
        hestiaDriver.createUser({
          username: 'ab', // Too short
          password: 'Pass123!',
          email: 'test@example.com',
        })
      ).rejects.toThrow('Username must be 3-16 characters');
    });

    test('should handle duplicate user', async () => {
      const username = 'dup-' + Math.random().toString(36).substring(7);

      // Create first
      await hestiaDriver.createUser({
        username,
        password: 'Pass123!',
        email: 'test1@example.com',
      });

      // Try to create duplicate
      await expect(
        hestiaDriver.createUser({
          username,
          password: 'Pass123!',
          email: 'test2@example.com',
        })
      ).rejects.toThrow();

      // Cleanup
      await hestiaDriver.deleteUser(username);
    });

    test('should handle invalid domain', async () => {
      await expect(
        hestiaDriver._validateDomain('invalid')
      ).toThrow('Invalid domain format');
    });

    test('should handle non-existent user deletion', async () => {
      await expect(
        hestiaDriver.deleteUser('nonexistent-' + Date.now())
      ).rejects.toThrow();
    });
  });
});

// ============================================================
// EXPORT TEST UTILITIES
// ============================================================

module.exports = {
  hestiaDriver,
  provisioningService,
  prisma,
  testOrderId,
  testUsername,
  testDomain,
  testEmail,
};
