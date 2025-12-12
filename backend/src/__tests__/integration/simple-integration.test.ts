// Simple integration tests for basic functionality
import request from 'supertest';
import app from '../../app';

describe('Simple Integration Tests', () => {
  describe('API Health and Basic Routes', () => {
    test('health endpoint returns success', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Server is healthy');
      expect(response.body.timestamp).toBeDefined();
    });

    test('404 handler works for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-route')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Route not found');
    });

    test('CORS headers are set correctly', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Authentication Routes Structure', () => {
    test('auth routes are accessible', async () => {
      // Test registration endpoint exists (even if it fails due to mocked DB)
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPassword123!'
        });

      // Should not be 404 (route exists)
      expect(response.status).not.toBe(404);
    });

    test('login endpoint exists', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!'
        });

      // Should not be 404 (route exists)
      expect(response.status).not.toBe(404);
    });
  });

  describe('Protected Routes', () => {
    test('protected routes require authentication', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('invalid token is rejected', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Message Routes Structure', () => {
    test('message routes exist', async () => {
      const response = await request(app)
        .post('/api/messages')
        .send({
          content: 'Test message',
          chatRoomId: 'test-room'
        });

      // Should require authentication, not be 404
      expect(response.status).toBe(401);
    });
  });

  describe('WebSocket Status Endpoint', () => {
    test('websocket status endpoint works', async () => {
      const response = await request(app)
        .get('/api/websocket/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.serverTime).toBeDefined();
      expect(response.body.data.uptime).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('malformed JSON is handled gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      // Express returns 400 for malformed JSON, but our error handler might return 500
      expect([400, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    test('missing required fields are validated', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('Content Type Handling', () => {
    test('accepts JSON content type', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPassword123!'
        }));

      // Should not be 415 (unsupported media type)
      expect(response.status).not.toBe(415);
    });

    test('handles URL encoded data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('username=testuser&email=test@example.com&password=TestPassword123!');

      // Should not be 415 (unsupported media type)
      expect(response.status).not.toBe(415);
    });
  });

  describe('Request Size Limits', () => {
    test('handles large JSON payloads within limit', async () => {
      const largeContent = 'x'.repeat(1000); // 1KB content
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPassword123!',
          extraData: largeContent
        });

      // Should not be 413 (payload too large)
      expect(response.status).not.toBe(413);
    });
  });

  describe('HTTP Methods', () => {
    test('GET method works on appropriate endpoints', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
    });

    test('POST method works on appropriate endpoints', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPassword123!'
        });

      // Should accept POST method
      expect(response.status).not.toBe(405);
    });

    test('unsupported methods return appropriate error', async () => {
      const response = await request(app)
        .patch('/api/health');

      // Should be method not allowed or not found
      expect([404, 405]).toContain(response.status);
    });
  });

  describe('Response Format Consistency', () => {
    test('success responses have consistent format', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('error responses have consistent format', async () => {
      const response = await request(app)
        .get('/api/unknown-route')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });
});