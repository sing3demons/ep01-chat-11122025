// Integration test runner and utilities
import { execSync } from 'child_process';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import app from '../../app';
import { WebSocketManager } from '../../websocket/websocket.manager';

export class IntegrationTestRunner {
  private server: any;
  private wsServer: WebSocketServer | null = null;
  private wsManager: WebSocketManager | null = null;
  private port: number = 0;

  async startTestServer(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = createServer(app);
      this.wsServer = new WebSocketServer({ server: this.server });
      this.wsManager = new WebSocketManager(this.wsServer);

      this.server.listen(0, (error: any) => {
        if (error) {
          reject(error);
        } else {
          this.port = this.server.address()?.port || 0;
          console.log(`Integration test server started on port ${this.port}`);
          resolve(this.port);
        }
      });
    });
  }

  async stopTestServer(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wsManager) {
        this.wsManager.cleanup();
      }
      
      if (this.server) {
        this.server.close(() => {
          console.log('Integration test server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getServerUrl(): string {
    return `http://localhost:${this.port}`;
  }

  getWebSocketUrl(): string {
    return `ws://localhost:${this.port}`;
  }

  async waitForServer(timeoutMs: number = 5000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(`${this.getServerUrl()}/api/health`);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Server did not become ready within ${timeoutMs}ms`);
  }

  async setupTestDatabase(): Promise<void> {
    try {
      // Reset test database
      console.log('Setting up test database...');
      execSync('npm run prisma:reset', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      // Generate Prisma client
      execSync('npm run prisma:generate', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      console.log('Test database setup complete');
    } catch (error) {
      console.error('Failed to setup test database:', error);
      throw error;
    }
  }

  async cleanupTestDatabase(): Promise<void> {
    try {
      console.log('Cleaning up test database...');
      // Additional cleanup if needed
    } catch (error) {
      console.error('Failed to cleanup test database:', error);
    }
  }
}

// Global test runner instance
export const testRunner = new IntegrationTestRunner();

// Test utilities
export class TestUtils {
  static async createTestUser(userData: {
    username: string;
    email: string;
    password: string;
  }) {
    const { AuthService } = await import('../../auth/auth.service');
    const { AuthRepository } = await import('../../auth/auth.repository');
    const authService = new AuthService(new AuthRepository());
    return authService.register(userData);
  }

  static async createTestChatRoom(token: string, roomData: {
    name?: string;
    type: 'direct' | 'group';
    participantIds: string[];
  }) {
    const response = await fetch(`${testRunner.getServerUrl()}/api/chatrooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(roomData)
    });
    
    return response.json();
  }

  static async sendTestMessage(token: string, messageData: {
    content: string;
    chatRoomId: string;
  }) {
    const response = await fetch(`${testRunner.getServerUrl()}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(messageData)
    });
    
    return response.json();
  }

  static createWebSocketConnection(token?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const WebSocket = require('ws');
      const wsUrl = token 
        ? `${testRunner.getWebSocketUrl()}?token=${token}`
        : testRunner.getWebSocketUrl();
      
      const ws = new WebSocket(wsUrl);
      
      ws.on('open', () => {
        if (token) {
          ws.send(JSON.stringify({
            type: 'authenticate',
            data: { token }
          }));
        }
        resolve(ws);
      });
      
      ws.on('error', reject);
      
      setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 5000);
    });
  }

  static waitForWebSocketMessage(
    ws: any, 
    messageType: string, 
    timeoutMs: number = 5000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for WebSocket message: ${messageType}`));
      }, timeoutMs);

      const messageHandler = (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === messageType) {
            clearTimeout(timeout);
            ws.off('message', messageHandler);
            resolve(message);
          }
        } catch (error) {
          // Ignore parsing errors
        }
      };

      ws.on('message', messageHandler);
    });
  }

  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static generateRandomString(length: number = 8): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static generateTestEmail(): string {
    return `test_${this.generateRandomString()}@example.com`;
  }

  static generateTestUsername(): string {
    return `testuser_${this.generateRandomString()}`;
  }
}

// Global setup and teardown for integration tests
export async function globalSetup() {
  console.log('Starting global integration test setup...');
  
  try {
    await testRunner.setupTestDatabase();
    await testRunner.startTestServer();
    await testRunner.waitForServer();
    
    console.log('Global integration test setup complete');
  } catch (error) {
    console.error('Global integration test setup failed:', error);
    throw error;
  }
}

export async function globalTeardown() {
  console.log('Starting global integration test teardown...');
  
  try {
    await testRunner.stopTestServer();
    await testRunner.cleanupTestDatabase();
    
    console.log('Global integration test teardown complete');
  } catch (error) {
    console.error('Global integration test teardown failed:', error);
  }
}