// Jest setup file for backend tests
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';

// Mock console methods to reduce noise in tests
if (process.env.SILENT_TESTS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Global test timeout
jest.setTimeout(15000);

// Global test setup
beforeAll(async () => {
  // Setup code that runs before all tests
});

afterAll(async () => {
  // Cleanup code that runs after all tests
});

beforeEach(() => {
  // Setup code that runs before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup code that runs after each test
});