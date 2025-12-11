// Frontend test setup
import '@testing-library/jest-dom';

// Mock WebSocket for testing
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // OPEN
})) as any;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock as any;

// Mock Notification API
const MockNotification = jest.fn(() => ({
  close: jest.fn(),
})) as any;
MockNotification.permission = 'granted';
MockNotification.requestPermission = jest.fn(() => Promise.resolve('granted'));
global.Notification = MockNotification;

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();