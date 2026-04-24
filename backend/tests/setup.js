/**
 * Jest Setup File
 * Configures global test environment and mocks
 */

// Mock external services
jest.mock('../src/modules/auth/services/mailer.service.js', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'mock-123' }),
  sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
  __esModule: true,
  default: {}
}), { virtual: true });

// Increase test timeout for API calls
jest.setTimeout(10000);

// Set test environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/whms_test';
