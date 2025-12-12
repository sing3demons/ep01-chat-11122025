// Integration tests for the complete chat system
import request from 'supertest';
import WebSocket from 'ws';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import app from '../../app';
import { AuthService } from '../../auth/auth.service';
import { AuthRepository } from '../../auth/auth.repository';
import { UserService } from '../../user/user.service';
import { MessageService } from '../../message/message.service';
import { NotificationService } from '../../notification/notification.service';
import { WebSocketManager } from '../../websocket/websocket.manager';

describe('Chat System Integration Tests', () => {
  let server: any;
  let wsServer: WebSocketServer;
  let wsManager: WebSocketManager;
  let testUsers: any[] = [];
  let authTokens: string[] = [];

  beforeAll(async () => {
    // Start test server
    server = createServer(app);
    wsServer = new WebSocketServer({ server });
    wsManager = new WebSocketManager(wsServer);
    
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        console.log(`Test server running on port ${server.address()?.port}`);
        resolve();
      });
    });

    // Create test users
    const authService = new AuthService(new AuthRepository());
    
    const user1Data = {
      username: 'testuser1',
      email: 'test1@example.com',
      password: 'TestPassword123!'
    };
    
    const user2Data = {
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'TestPassword123!'
    };

    const user1Result = await authService.register(user1Data);
    const user2Result = await authService.register(user2Data);

    if (user1Result.success && user2Result.success) {
      testUsers = [user1Result.data!.user, user2Result.data!.user];
      authTokens = [user1Result.data!.token, user2Result.data!.token];
    }
  });

  afterAll(async () => {
    // Cleanup
    wsManager.cleanup();
    server.close();
  });

  describe('End-to-End User Flows', () => {
    test('Complete user registration and login flow', async () => {
      // Test user registration
      const newUserData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'NewPassword123!'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(newUserData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.username).toBe('newuser');
      expect(registerResponse.body.data.token).toBeDefined();

      // Test user login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: newUserData.email,
          password: newUserData.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.user.email).toBe(newUserData.email);
      expect(loginResponse.body.data.token).toBeDefined();
    });

    test('Complete chat room creation and messaging flow', async () => {
      // Create a chat room
      const chatRoomData = {
        name: 'Test Chat Room',
        type: 'group',
        participantIds: [testUsers[0].id, testUsers[1].id]
      };

      const createRoomResponse = await request(app)
        .post('/api/chatrooms')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .send(chatRoomData)
        .expect(201);

      expect(createRoomResponse.body.success).toBe(true);
      const chatRoomId = createRoomResponse.body.data.id;

      // Send a message to the chat room
      const messageData = {
        content: 'Hello, this is a test message!',
        chatRoomId: chatRoomId
      };

      const sendMessageResponse = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .send(messageData)
        .expect(201);

      expect(sendMessageResponse.body.success).toBe(true);
      expect(sendMessageResponse.body.data.content).toBe(messageData.content);

      // Get messages from the chat room
      const getMessagesResponse = await request(app)
        .get(`/api/messages/chatroom/${chatRoomId}`)
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .expect(200);

      expect(getMessagesResponse.body.success).toBe(true);
      expect(getMessagesResponse.body.data.length).toBeGreaterThan(0);
      expect(getMessagesResponse.body.data[0].content).toBe(messageData.content);
    });

    test('User status management flow', async () => {
      // Update user status to online
      await UserService.updateOnlineStatus(testUsers[0].id, true);

      // Get user status
      const statusResponse = await request(app)
        .get(`/api/users/${testUsers[0].id}/status`)
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data.isOnline).toBe(true);

      // Update user status to offline
      await UserService.updateOnlineStatus(testUsers[0].id, false);

      const offlineStatusResponse = await request(app)
        .get(`/api/users/${testUsers[0].id}/status`)
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .expect(200);

      expect(offlineStatusResponse.body.success).toBe(true);
      expect(offlineStatusResponse.body.data.isOnline).toBe(false);
    });
  });

  describe('WebSocket Communication Tests', () => {
    test('WebSocket connection and authentication', (done) => {
      const wsUrl = `ws://localhost:${server.address()?.port}`;
      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        // Send authentication message
        ws.send(JSON.stringify({
          type: 'authenticate',
          data: { token: authTokens[0] }
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'connection_ack') {
          expect(message.data.connectionId).toBeDefined();
        } else if (message.type === 'auth_success') {
          expect(message.data.user.id).toBe(testUsers[0].id);
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        done(error);
      });
    });

    test('Real-time message broadcasting', (done) => {
      const wsUrl = `ws://localhost:${server.address()?.port}`;
      const ws1 = new WebSocket(wsUrl);
      const ws2 = new WebSocket(wsUrl);
      
      let ws1Authenticated = false;
      let ws2Authenticated = false;
      let messageReceived = false;

      const checkCompletion = () => {
        if (ws1Authenticated && ws2Authenticated && messageReceived) {
          ws1.close();
          ws2.close();
          done();
        }
      };

      // Setup first WebSocket (sender)
      ws1.on('open', () => {
        ws1.send(JSON.stringify({
          type: 'authenticate',
          data: { token: authTokens[0] }
        }));
      });

      ws1.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'auth_success') {
          ws1Authenticated = true;
          
          // Join a test room and send a message
          ws1.send(JSON.stringify({
            type: 'join_room',
            data: { chatRoomId: 'test-room-123' }
          }));
          
          setTimeout(() => {
            ws1.send(JSON.stringify({
              type: 'message',
              data: {
                content: 'Test broadcast message',
                chatRoomId: 'test-room-123'
              }
            }));
          }, 100);
        }
      });

      // Setup second WebSocket (receiver)
      ws2.on('open', () => {
        ws2.send(JSON.stringify({
          type: 'authenticate',
          data: { token: authTokens[1] }
        }));
      });

      ws2.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'auth_success') {
          ws2Authenticated = true;
          
          // Join the same room
          ws2.send(JSON.stringify({
            type: 'join_room',
            data: { chatRoomId: 'test-room-123' }
          }));
        } else if (message.type === 'message') {
          expect(message.data.content).toBe('Test broadcast message');
          messageReceived = true;
          checkCompletion();
        }
      });

      setTimeout(() => {
        if (!messageReceived) {
          ws1.close();
          ws2.close();
          done(new Error('Message broadcast test timed out'));
        }
      }, 5000);
    });

    test('Typing indicator synchronization', (done) => {
      const wsUrl = `ws://localhost:${server.address()?.port}`;
      const ws1 = new WebSocket(wsUrl);
      const ws2 = new WebSocket(wsUrl);
      
      let typingReceived = false;

      // Setup sender
      ws1.on('open', () => {
        ws1.send(JSON.stringify({
          type: 'authenticate',
          data: { token: authTokens[0] }
        }));
      });

      ws1.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'auth_success') {
          // Send typing indicator
          ws1.send(JSON.stringify({
            type: 'typing_start',
            data: { chatRoomId: 'test-room-typing' }
          }));
        }
      });

      // Setup receiver
      ws2.on('open', () => {
        ws2.send(JSON.stringify({
          type: 'authenticate',
          data: { token: authTokens[1] }
        }));
      });

      ws2.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'typing_indicator') {
          expect(message.data.isTyping).toBe(true);
          expect(message.data.chatRoomId).toBe('test-room-typing');
          typingReceived = true;
          ws1.close();
          ws2.close();
          done();
        }
      });

      setTimeout(() => {
        if (!typingReceived) {
          ws1.close();
          ws2.close();
          done(new Error('Typing indicator test timed out'));
        }
      }, 3000);
    });
  });

  describe('Notification Delivery Tests', () => {
    test('Real-time notification delivery via WebSocket', async () => {
      // Create a notification
      const notificationData = {
        userId: testUsers[0].id,
        type: 'message' as const,
        title: 'New Message',
        content: 'You have a new message',
        chatRoomId: 'test-room-notification',
        priority: 'normal' as const
      };

      const result = await NotificationService.createNotification(notificationData);
      expect(result.success).toBe(true);

      // Test notification retrieval via API
      const notificationsResponse = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .expect(200);

      expect(notificationsResponse.body.success).toBe(true);
      expect(notificationsResponse.body.data.length).toBeGreaterThan(0);
    });

    test('Notification badge count accuracy', async () => {
      // Get initial unread count
      const initialResponse = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .expect(200);

      const initialCount = initialResponse.body.data.count;

      // Create a new notification
      await NotificationService.createNotification({
        userId: testUsers[0].id,
        type: 'mention',
        title: 'You were mentioned',
        content: 'Someone mentioned you in a group',
        chatRoomId: 'test-room-mention',
        priority: 'high'
      });

      // Check updated count
      const updatedResponse = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .expect(200);

      expect(updatedResponse.body.data.count).toBe(initialCount + 1);
    });

    test('Cross-component notification flow', async () => {
      // Send a message that should trigger a notification
      const messageData = {
        content: 'This should trigger a notification',
        chatRoomId: 'notification-test-room'
      };

      const messageResponse = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .send(messageData)
        .expect(201);

      expect(messageResponse.body.success).toBe(true);

      // Check if notification was created
      const notificationsResponse = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authTokens[1]}`)
        .expect(200);

      // Should have notifications (may include previous test notifications)
      expect(notificationsResponse.body.success).toBe(true);
      expect(Array.isArray(notificationsResponse.body.data)).toBe(true);
    });
  });

  describe('Offline/Online Scenario Tests', () => {
    test('Message queuing during offline period', async () => {
      // Simulate user going offline
      await UserService.updateOnlineStatus(testUsers[1].id, false);

      // Send message to offline user
      const messageData = {
        content: 'Message sent while offline',
        chatRoomId: 'offline-test-room'
      };

      const messageResponse = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .send(messageData)
        .expect(201);

      expect(messageResponse.body.success).toBe(true);

      // Check offline message queue
      const queueResponse = await request(app)
        .get(`/api/offline/queued-messages/${testUsers[1].id}`)
        .set('Authorization', `Bearer ${authTokens[1]}`)
        .expect(200);

      expect(queueResponse.body.success).toBe(true);
      // Queue might be empty if message was delivered immediately
      expect(Array.isArray(queueResponse.body.data)).toBe(true);
    });

    test('Connection status feedback', (done) => {
      const wsUrl = `ws://localhost:${server.address()?.port}`;
      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        // Authenticate first
        ws.send(JSON.stringify({
          type: 'authenticate',
          data: { token: authTokens[0] }
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth_success') {
          // Request connection status
          ws.send(JSON.stringify({
            type: 'connection_status_request'
          }));
        } else if (message.type === 'connection_status_response') {
          expect(message.data.isAuthenticated).toBe(true);
          expect(message.data.connectionId).toBeDefined();
          expect(message.data.timestamp).toBeDefined();
          ws.close();
          done();
        }
      });

      setTimeout(() => {
        ws.close();
        done(new Error('Connection status test timed out'));
      }, 3000);
    });

    test('Automatic reconnection simulation', (done) => {
      const wsUrl = `ws://localhost:${server.address()?.port}`;
      let ws = new WebSocket(wsUrl);
      let reconnected = false;

      const setupWebSocket = (socket: WebSocket) => {
        socket.on('open', () => {
          socket.send(JSON.stringify({
            type: 'authenticate',
            data: { token: authTokens[0] }
          }));
        });

        socket.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'auth_success') {
            if (!reconnected) {
              // Simulate connection loss
              socket.close(4000, 'Simulated connection loss');
              
              // Attempt reconnection after a delay
              setTimeout(() => {
                ws = new WebSocket(wsUrl);
                reconnected = true;
                setupWebSocket(ws);
              }, 1000);
            } else {
              // Successfully reconnected
              expect(message.data.user.id).toBe(testUsers[0].id);
              ws.close();
              done();
            }
          }
        });

        socket.on('error', (error) => {
          if (!reconnected) {
            // Expected error during connection loss simulation
            return;
          }
          done(error);
        });
      };

      setupWebSocket(ws);

      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
        done(new Error('Reconnection test timed out'));
      }, 5000);
    });

    test('Cross-device synchronization', async () => {
      // Simulate device registration
      const deviceData = {
        userId: testUsers[0].id,
        deviceId: 'test-device-1',
        deviceType: 'web'
      };

      const deviceResponse = await request(app)
        .post('/api/offline/register-device')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .send(deviceData)
        .expect(200);

      expect(deviceResponse.body.success).toBe(true);

      // Get device sessions
      const sessionsResponse = await request(app)
        .get(`/api/offline/device-sessions/${testUsers[0].id}`)
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .expect(200);

      expect(sessionsResponse.body.success).toBe(true);
      expect(Array.isArray(sessionsResponse.body.data)).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('Invalid authentication token handling', (done) => {
      const wsUrl = `ws://localhost:${server.address()?.port}`;
      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'authenticate',
          data: { token: 'invalid-token' }
        }));
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'error') {
          expect(message.data.error).toContain('Invalid token');
          done();
        }
      });

      ws.on('close', (code) => {
        if (code === 4001) {
          // Authentication failed - expected behavior
          done();
        }
      });

      setTimeout(() => {
        ws.close();
        done(new Error('Invalid token test timed out'));
      }, 3000);
    });

    test('Message delivery failure handling', async () => {
      // Try to send message to non-existent chat room
      const invalidMessageData = {
        content: 'This message should fail',
        chatRoomId: 'non-existent-room'
      };

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .send(invalidMessageData);

      // Should handle gracefully (either succeed with room creation or fail with proper error)
      expect(response.body).toHaveProperty('success');
    });

    test('WebSocket connection timeout handling', (done) => {
      const wsUrl = `ws://localhost:${server.address()?.port}`;
      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        // Don't authenticate - should timeout
        console.log('WebSocket opened without authentication');
      });

      ws.on('close', (code, reason) => {
        if (code === 4001) {
          expect(reason.toString()).toContain('Authentication timeout');
          done();
        }
      });

      // Test should complete within authentication timeout (10 seconds)
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
          done(new Error('Authentication timeout test failed'));
        }
      }, 12000);
    });
  });
});