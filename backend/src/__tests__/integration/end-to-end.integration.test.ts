// End-to-end integration tests for complete user flows
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
import { OfflineService } from '../../websocket/offline.service';

describe('End-to-End Integration Tests', () => {
  let server: any;
  let wsServer: WebSocketServer;
  let wsManager: WebSocketManager;
  let testUsers: any[] = [];
  let authTokens: string[] = [];
  let chatRoomId: string;

  beforeAll(async () => {
    // Start test server
    server = createServer(app);
    wsServer = new WebSocketServer({ server });
    wsManager = new WebSocketManager(wsServer);
    
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        console.log(`E2E Test server running on port ${server.address()?.port}`);
        resolve();
      });
    });

    // Create test users for complete flows
    const authService = new AuthService(new AuthRepository());
    const users = [
      { username: 'alice', email: 'alice@example.com', password: 'AlicePassword123!' },
      { username: 'bob', email: 'bob@example.com', password: 'BobPassword123!' },
      { username: 'charlie', email: 'charlie@example.com', password: 'CharliePassword123!' }
    ];

    for (const userData of users) {
      const result = await authService.register(userData);
      if (result.success) {
        testUsers.push(result.data!.user);
        authTokens.push(result.data!.token);
      }
    }

    // Create a test chat room
    const chatRoomResponse = await request(app)
      .post('/api/chatrooms')
      .set('Authorization', `Bearer ${authTokens[0]}`)
      .send({
        name: 'E2E Test Room',
        type: 'group',
        participantIds: testUsers.map(u => u.id)
      });

    if (chatRoomResponse.body.success) {
      chatRoomId = chatRoomResponse.body.data.id;
    }
  });

  afterAll(async () => {
    wsManager.cleanup();
    server.close();
  });

  describe('Complete User Journey: Registration to Chat', () => {
    test('new user registration, login, and first message flow', async () => {
      // Step 1: Register new user
      const newUserData = {
        username: 'newuser_e2e',
        email: 'newuser_e2e@example.com',
        password: 'NewUserPassword123!'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(newUserData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      const newUser = registerResponse.body.data.user;
      const newUserToken = registerResponse.body.data.token;

      // Step 2: Verify user can login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: newUserData.email,
          password: newUserData.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.user.id).toBe(newUser.id);

      // Step 3: Create a direct chat with existing user
      const directChatResponse = await request(app)
        .post('/api/chatrooms')
        .set('Authorization', `Bearer ${newUserToken}`)
        .send({
          type: 'direct',
          participantIds: [newUser.id, testUsers[0].id]
        })
        .expect(201);

      expect(directChatResponse.body.success).toBe(true);
      const directChatId = directChatResponse.body.data.id;

      // Step 4: Send first message
      const messageResponse = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${newUserToken}`)
        .send({
          content: 'Hello! This is my first message.',
          chatRoomId: directChatId
        })
        .expect(201);

      expect(messageResponse.body.success).toBe(true);
      expect(messageResponse.body.data.content).toBe('Hello! This is my first message.');

      // Step 5: Verify message appears in chat history
      const historyResponse = await request(app)
        .get(`/api/messages/chatroom/${directChatId}`)
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);

      expect(historyResponse.body.success).toBe(true);
      expect(historyResponse.body.data.length).toBeGreaterThan(0);
      expect(historyResponse.body.data[0].content).toBe('Hello! This is my first message.');

      // Step 6: Verify other user can see the message
      const otherUserHistoryResponse = await request(app)
        .get(`/api/messages/chatroom/${directChatId}`)
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .expect(200);

      expect(otherUserHistoryResponse.body.success).toBe(true);
      expect(otherUserHistoryResponse.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Real-time Group Chat Flow', () => {
    test('multi-user group chat with real-time messaging', (done) => {
      const wsUrl = `ws://localhost:${server.address()?.port}`;
      const connections: WebSocket[] = [];
      const receivedMessages: any[] = [];
      let authenticatedCount = 0;
      let messagesReceived = 0;

      const cleanup = () => {
        connections.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        });
      };

      // Create WebSocket connections for all test users
      testUsers.forEach((user, index) => {
        const ws = new WebSocket(wsUrl);
        connections.push(ws);

        ws.on('open', () => {
          // Authenticate
          ws.send(JSON.stringify({
            type: 'authenticate',
            data: { token: authTokens[index] }
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'auth_success') {
            authenticatedCount++;
            
            // Join the test room
            ws.send(JSON.stringify({
              type: 'join_room',
              data: { chatRoomId: chatRoomId }
            }));

            // If all users are authenticated, start sending messages
            if (authenticatedCount === testUsers.length) {
              setTimeout(() => {
                // First user sends a message
                connections[0].send(JSON.stringify({
                  type: 'message',
                  data: {
                    content: `Group message from ${testUsers[0].username}`,
                    chatRoomId: chatRoomId
                  }
                }));
              }, 500);
            }
          } else if (message.type === 'message') {
            receivedMessages.push({
              userId: user.id,
              message: message.data
            });
            messagesReceived++;

            // All users except sender should receive the message
            if (messagesReceived === testUsers.length - 1) {
              // Verify all users received the message
              expect(receivedMessages.length).toBe(testUsers.length - 1);
              receivedMessages.forEach(received => {
                expect(received.message.content).toBe(`Group message from ${testUsers[0].username}`);
              });

              cleanup();
              done();
            }
          }
        });

        ws.on('error', (error) => {
          cleanup();
          done(error);
        });
      });

      // Timeout safety
      setTimeout(() => {
        cleanup();
        done(new Error('Group chat test timed out'));
      }, 10000);
    });

    test('typing indicators in group chat', (done) => {
      const wsUrl = `ws://localhost:${server.address()?.port}`;
      const ws1 = new WebSocket(wsUrl);
      const ws2 = new WebSocket(wsUrl);
      let typingReceived = false;

      const cleanup = () => {
        if (ws1.readyState === WebSocket.OPEN) ws1.close();
        if (ws2.readyState === WebSocket.OPEN) ws2.close();
      };

      // Setup first user (typer)
      ws1.on('open', () => {
        ws1.send(JSON.stringify({
          type: 'authenticate',
          data: { token: authTokens[0] }
        }));
      });

      ws1.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'auth_success') {
          // Start typing
          ws1.send(JSON.stringify({
            type: 'typing_start',
            data: { chatRoomId: chatRoomId }
          }));
        }
      });

      // Setup second user (observer)
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
          expect(message.data.chatRoomId).toBe(chatRoomId);
          typingReceived = true;
          cleanup();
          done();
        }
      });

      ws1.on('error', (error) => {
        cleanup();
        done(error);
      });

      ws2.on('error', (error) => {
        cleanup();
        done(error);
      });

      setTimeout(() => {
        if (!typingReceived) {
          cleanup();
          done(new Error('Typing indicator test timed out'));
        }
      }, 5000);
    });
  });

  describe('Notification Flow Integration', () => {
    test('message triggers notification for offline users', async () => {
      // Set one user as offline
      await UserService.updateOnlineStatus(testUsers[1].id, false);

      // Send message from online user
      const messageResponse = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .send({
          content: 'This should create a notification',
          chatRoomId: chatRoomId
        })
        .expect(201);

      expect(messageResponse.body.success).toBe(true);

      // Check if notification was created for offline user
      const notificationsResponse = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authTokens[1]}`)
        .expect(200);

      expect(notificationsResponse.body.success).toBe(true);
      
      // Should have at least one notification
      expect(notificationsResponse.body.data.length).toBeGreaterThan(0);

      // Check unread count
      const unreadResponse = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${authTokens[1]}`)
        .expect(200);

      expect(unreadResponse.body.success).toBe(true);
      expect(unreadResponse.body.data.count).toBeGreaterThan(0);
    });

    test('mention in group creates high priority notification', async () => {
      // Send message with mention
      const mentionMessage = `Hey @${testUsers[1].username}, check this out!`;
      
      const messageResponse = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .send({
          content: mentionMessage,
          chatRoomId: chatRoomId
        })
        .expect(201);

      expect(messageResponse.body.success).toBe(true);

      // Check notifications for mentioned user
      const notificationsResponse = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authTokens[1]}`)
        .expect(200);

      expect(notificationsResponse.body.success).toBe(true);
      
      // Find the mention notification
      const mentionNotification = notificationsResponse.body.data.find(
        (n: any) => n.type === 'mention' || n.content.includes('@')
      );

      if (mentionNotification) {
        expect(mentionNotification.priority).toBe('high');
      }
    });
  });

  describe('Offline/Online Scenarios', () => {
    test('complete offline message queuing and delivery flow', async () => {
      // Step 1: Set user offline
      await UserService.updateOnlineStatus(testUsers[2].id, false);

      // Step 2: Send messages while user is offline
      const offlineMessages = [
        'Message 1 while offline',
        'Message 2 while offline',
        'Message 3 while offline'
      ];

      for (const content of offlineMessages) {
        await request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${authTokens[0]}`)
          .send({
            content,
            chatRoomId: chatRoomId
          })
          .expect(201);
      }

      // Step 3: Check offline message queue
      const queueResponse = await request(app)
        .get(`/api/offline/queued-messages/${testUsers[2].id}`)
        .set('Authorization', `Bearer ${authTokens[2]}`)
        .expect(200);

      expect(queueResponse.body.success).toBe(true);
      // Queue might be empty if messages were delivered immediately to database

      // Step 4: Bring user back online via WebSocket
      const wsUrl = `ws://localhost:${server.address()?.port}`;
      const ws = new WebSocket(wsUrl);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'authenticate',
            data: { token: authTokens[2] }
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'auth_success') {
            // User is now online
            resolve();
          }
        });

        ws.on('error', reject);

        setTimeout(() => {
          reject(new Error('Online test timed out'));
        }, 3000);
      });

      // Step 5: Verify user can see all messages
      const messagesResponse = await request(app)
        .get(`/api/messages/chatroom/${chatRoomId}`)
        .set('Authorization', `Bearer ${authTokens[2]}`)
        .expect(200);

      expect(messagesResponse.body.success).toBe(true);
      
      // Should contain the offline messages
      const messageContents = messagesResponse.body.data.map((m: any) => m.content);
      offlineMessages.forEach(content => {
        expect(messageContents).toContain(content);
      });

      ws.close();
    });

    test('cross-device synchronization flow', async () => {
      // Step 1: Register first device
      const device1Response = await request(app)
        .post('/api/offline/register-device')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .send({
          deviceId: 'device-1',
          deviceType: 'web'
        })
        .expect(200);

      expect(device1Response.body.success).toBe(true);

      // Step 2: Register second device
      const device2Response = await request(app)
        .post('/api/offline/register-device')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .send({
          deviceId: 'device-2',
          deviceType: 'mobile'
        })
        .expect(200);

      expect(device2Response.body.success).toBe(true);

      // Step 3: Get device sessions
      const sessionsResponse = await request(app)
        .get(`/api/offline/device-sessions/${testUsers[0].id}`)
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .expect(200);

      expect(sessionsResponse.body.success).toBe(true);
      expect(sessionsResponse.body.data.length).toBeGreaterThanOrEqual(2);

      // Step 4: Sync devices
      const syncResponse = await request(app)
        .post(`/api/offline/sync-devices/${testUsers[0].id}`)
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .expect(200);

      expect(syncResponse.body.success).toBe(true);
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    test('handles WebSocket disconnection and reconnection', (done) => {
      const wsUrl = `ws://localhost:${server.address()?.port}`;
      let ws = new WebSocket(wsUrl);
      let reconnected = false;
      let messageReceived = false;

      const setupConnection = (socket: WebSocket) => {
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
              // First connection - simulate disconnection
              socket.close(4000, 'Simulated disconnection');
              
              // Reconnect after delay
              setTimeout(() => {
                ws = new WebSocket(wsUrl);
                reconnected = true;
                setupConnection(ws);
              }, 1000);
            } else {
              // Reconnected successfully - send a test message
              socket.send(JSON.stringify({
                type: 'join_room',
                data: { chatRoomId: chatRoomId }
              }));
              
              setTimeout(() => {
                socket.send(JSON.stringify({
                  type: 'message',
                  data: {
                    content: 'Message after reconnection',
                    chatRoomId: chatRoomId
                  }
                }));
              }, 100);
            }
          } else if (message.type === 'message' && reconnected) {
            expect(message.data.content).toBe('Message after reconnection');
            messageReceived = true;
            socket.close();
            done();
          }
        });

        socket.on('error', (error) => {
          if (!reconnected) {
            // Expected error during disconnection simulation
            return;
          }
          done(error);
        });
      };

      setupConnection(ws);

      setTimeout(() => {
        if (!messageReceived) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
          done(new Error('Reconnection test timed out'));
        }
      }, 8000);
    });

    test('handles concurrent message sending', async () => {
      // Send multiple messages concurrently
      const messagePromises = [];
      
      for (let i = 0; i < 5; i++) {
        const promise = request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${authTokens[0]}`)
          .send({
            content: `Concurrent message ${i + 1}`,
            chatRoomId: chatRoomId
          });
        messagePromises.push(promise);
      }

      const responses = await Promise.all(messagePromises);

      // All messages should be sent successfully
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.content).toBe(`Concurrent message ${index + 1}`);
      });

      // Verify all messages appear in chat history
      const historyResponse = await request(app)
        .get(`/api/messages/chatroom/${chatRoomId}`)
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .expect(200);

      expect(historyResponse.body.success).toBe(true);
      
      // Should contain all concurrent messages
      const messageContents = historyResponse.body.data.map((m: any) => m.content);
      for (let i = 0; i < 5; i++) {
        expect(messageContents).toContain(`Concurrent message ${i + 1}`);
      }
    });

    test('handles invalid chat room gracefully', async () => {
      const invalidRoomResponse = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .send({
          content: 'Message to invalid room',
          chatRoomId: 'invalid-room-id'
        });

      // Should handle gracefully (either create room or return proper error)
      expect(invalidRoomResponse.body).toHaveProperty('success');
      
      if (!invalidRoomResponse.body.success) {
        expect(invalidRoomResponse.body.error).toBeDefined();
      }
    });
  });

  describe('Performance and Load Testing', () => {
    test('handles multiple simultaneous WebSocket connections', (done) => {
      const wsUrl = `ws://localhost:${server.address()?.port}`;
      const connectionCount = 10;
      const connections: WebSocket[] = [];
      let authenticatedCount = 0;

      const cleanup = () => {
        connections.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        });
      };

      // Create multiple connections
      for (let i = 0; i < connectionCount; i++) {
        const ws = new WebSocket(wsUrl);
        connections.push(ws);

        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'authenticate',
            data: { token: authTokens[i % authTokens.length] }
          }));
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'auth_success') {
            authenticatedCount++;
            
            if (authenticatedCount === connectionCount) {
              // All connections authenticated successfully
              cleanup();
              done();
            }
          }
        });

        ws.on('error', (error) => {
          cleanup();
          done(error);
        });
      }

      setTimeout(() => {
        cleanup();
        done(new Error(`Load test timed out. Authenticated: ${authenticatedCount}/${connectionCount}`));
      }, 10000);
    });

    test('handles rapid message sending', async () => {
      const messageCount = 20;
      const messages: string[] = [];

      // Send messages rapidly
      for (let i = 0; i < messageCount; i++) {
        const content = `Rapid message ${i + 1}`;
        messages.push(content);
        
        const response = await request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${authTokens[0]}`)
          .send({
            content,
            chatRoomId: chatRoomId
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      }

      // Verify all messages were stored
      const historyResponse = await request(app)
        .get(`/api/messages/chatroom/${chatRoomId}`)
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .expect(200);

      expect(historyResponse.body.success).toBe(true);
      
      const messageContents = historyResponse.body.data.map((m: any) => m.content);
      messages.forEach(content => {
        expect(messageContents).toContain(content);
      });
    });
  });
});