// Frontend WebSocket integration tests
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WebSocketProvider, useWebSocket } from '../../contexts/WebSocketContext';
import { websocketService } from '../../services/websocket.service';
import { offlineService } from '../../services/offline.service';

// Mock WebSocket for testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 100);
  }

  send(data: string) {
    // Simulate server responses based on sent data
    const message = JSON.parse(data);
    
    setTimeout(() => {
      if (this.onmessage) {
        let response;
        
        switch (message.type) {
          case 'authenticate':
            response = {
              type: 'auth_success',
              data: {
                user: {
                  id: 'test-user-id',
                  username: 'testuser',
                  email: 'test@example.com',
                  isOnline: true
                }
              },
              timestamp: new Date().toISOString()
            };
            break;
            
          case 'message':
            response = {
              type: 'message',
              payload: {
                id: 'msg-' + Date.now(),
                content: message.payload.content,
                senderId: message.payload.senderId,
                chatRoomId: message.payload.chatRoomId,
                timestamp: new Date().toISOString(),
                status: 'sent'
              }
            };
            break;
            
          case 'typing':
            response = {
              type: 'typing',
              payload: {
                userId: message.payload.userId,
                chatRoomId: message.payload.chatRoomId,
                isTyping: message.payload.isTyping
              }
            };
            break;
            
          case 'ping':
            response = { type: 'pong' };
            break;
            
          default:
            return;
        }
        
        this.onmessage(new MessageEvent('message', {
          data: JSON.stringify(response)
        }));
      }
    }, 50);
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }
}

// Mock the global WebSocket
(global as any).WebSocket = MockWebSocket;

// Test component that uses WebSocket context
const TestChatComponent: React.FC = () => {
  const {
    isConnected,
    connectionStatus,
    messages,
    typingIndicators,
    sendMessage,
    sendTyping,
    connect,
    disconnect,
    queuedMessages,
    offlineQueueStats
  } = useWebSocket();

  const [messageInput, setMessageInput] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      sendMessage(messageInput, 'test-room', 'test-user');
      setMessageInput('');
    }
  };

  const handleTyping = (typing: boolean) => {
    setIsTyping(typing);
    sendTyping('test-room', 'test-user', typing);
  };

  return (
    <div>
      <div data-testid="connection-status">
        Status: {connectionStatus}
      </div>
      <div data-testid="is-connected">
        Connected: {isConnected ? 'Yes' : 'No'}
      </div>
      
      <div data-testid="messages">
        {messages.map((msg, index) => (
          <div key={msg.id || index} data-testid={`message-${index}`}>
            {msg.content} - {msg.status}
          </div>
        ))}
      </div>
      
      <div data-testid="typing-indicators">
        {typingIndicators.map((indicator, index) => (
          <div key={index} data-testid={`typing-${index}`}>
            User {indicator.userId} is typing in {indicator.chatRoomId}
          </div>
        ))}
      </div>
      
      <div data-testid="queued-messages">
        Queued: {queuedMessages.length}
      </div>
      
      <div data-testid="offline-stats">
        Queue Stats: {JSON.stringify(offlineQueueStats)}
      </div>
      
      <input
        data-testid="message-input"
        value={messageInput}
        onChange={(e) => setMessageInput(e.target.value)}
        onFocus={() => handleTyping(true)}
        onBlur={() => handleTyping(false)}
      />
      
      <button data-testid="send-button" onClick={handleSendMessage}>
        Send Message
      </button>
      
      <button data-testid="connect-button" onClick={() => connect('test-token')}>
        Connect
      </button>
      
      <button data-testid="disconnect-button" onClick={disconnect}>
        Disconnect
      </button>
    </div>
  );
};

describe('WebSocket Integration Tests', () => {
  beforeEach(() => {
    // Clear any existing WebSocket instances
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    websocketService.disconnect();
  });

  describe('WebSocket Connection Management', () => {
    test('establishes WebSocket connection and authenticates', async () => {
      render(
        <WebSocketProvider>
          <TestChatComponent />
        </WebSocketProvider>
      );

      const connectButton = screen.getByTestId('connect-button');
      
      await act(async () => {
        await userEvent.click(connectButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
        expect(screen.getByTestId('is-connected')).toHaveTextContent('Connected: Yes');
      }, { timeout: 3000 });
    });

    test('handles connection status changes', async () => {
      render(
        <WebSocketProvider>
          <TestChatComponent />
        </WebSocketProvider>
      );

      // Initially disconnected
      expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected');

      const connectButton = screen.getByTestId('connect-button');
      
      await act(async () => {
        await userEvent.click(connectButton);
      });

      // Should show connecting then connected
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
      });

      const disconnectButton = screen.getByTestId('disconnect-button');
      
      await act(async () => {
        await userEvent.click(disconnectButton);
      });

      // Should show disconnected
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected');
      });
    });
  });

  describe('Real-time Messaging', () => {
    test('sends and receives messages in real-time', async () => {
      render(
        <WebSocketProvider>
          <TestChatComponent />
        </WebSocketProvider>
      );

      // Connect first
      const connectButton = screen.getByTestId('connect-button');
      await act(async () => {
        await userEvent.click(connectButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-connected')).toHaveTextContent('Connected: Yes');
      });

      // Send a message
      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');

      await act(async () => {
        await userEvent.type(messageInput, 'Hello, World!');
        await userEvent.click(sendButton);
      });

      // Check if message appears in the UI
      await waitFor(() => {
        const messageElement = screen.getByTestId('message-0');
        expect(messageElement).toHaveTextContent('Hello, World! - sent');
      });
    });

    test('displays typing indicators', async () => {
      render(
        <WebSocketProvider>
          <TestChatComponent />
        </WebSocketProvider>
      );

      // Connect first
      const connectButton = screen.getByTestId('connect-button');
      await act(async () => {
        await userEvent.click(connectButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-connected')).toHaveTextContent('Connected: Yes');
      });

      // Focus on input to trigger typing
      const messageInput = screen.getByTestId('message-input');
      
      await act(async () => {
        await userEvent.click(messageInput);
      });

      // Check if typing indicator appears
      await waitFor(() => {
        const typingElement = screen.getByTestId('typing-0');
        expect(typingElement).toHaveTextContent('User test-user is typing in test-room');
      });
    });
  });

  describe('Offline Support', () => {
    test('queues messages when offline', async () => {
      render(
        <WebSocketProvider>
          <TestChatComponent />
        </WebSocketProvider>
      );

      // Don't connect - simulate offline state
      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');

      await act(async () => {
        await userEvent.type(messageInput, 'Offline message');
        await userEvent.click(sendButton);
      });

      // Message should be queued
      await waitFor(() => {
        const queuedElement = screen.getByTestId('queued-messages');
        expect(queuedElement).toHaveTextContent('Queued: 1');
      });
    });

    test('processes queued messages when connection is restored', async () => {
      render(
        <WebSocketProvider>
          <TestChatComponent />
        </WebSocketProvider>
      );

      // Send message while offline
      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');

      await act(async () => {
        await userEvent.type(messageInput, 'Queued message');
        await userEvent.click(sendButton);
      });

      // Verify message is queued
      await waitFor(() => {
        const queuedElement = screen.getByTestId('queued-messages');
        expect(queuedElement).toHaveTextContent('Queued: 1');
      });

      // Connect to process queue
      const connectButton = screen.getByTestId('connect-button');
      await act(async () => {
        await userEvent.click(connectButton);
      });

      // Wait for connection and queue processing
      await waitFor(() => {
        expect(screen.getByTestId('is-connected')).toHaveTextContent('Connected: Yes');
      });

      // Queue should be processed (messages sent)
      await waitFor(() => {
        const queuedElement = screen.getByTestId('queued-messages');
        expect(queuedElement).toHaveTextContent('Queued: 0');
      }, { timeout: 3000 });
    });

    test('displays offline queue statistics', async () => {
      render(
        <WebSocketProvider>
          <TestChatComponent />
        </WebSocketProvider>
      );

      // Check initial stats
      const statsElement = screen.getByTestId('offline-stats');
      expect(statsElement).toHaveTextContent('Queue Stats:');

      // Send some messages while offline
      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');

      for (let i = 0; i < 3; i++) {
        await act(async () => {
          await userEvent.clear(messageInput);
          await userEvent.type(messageInput, `Message ${i + 1}`);
          await userEvent.click(sendButton);
        });
      }

      // Stats should update
      await waitFor(() => {
        const statsElement = screen.getByTestId('offline-stats');
        const statsText = statsElement.textContent || '';
        expect(statsText).toContain('total');
      });
    });
  });

  describe('Error Handling', () => {
    test('handles WebSocket connection errors gracefully', async () => {
      // Mock WebSocket that fails to connect
      const FailingWebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url);
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Event('error'));
            }
          }, 100);
        }
      };

      (global as any).WebSocket = FailingWebSocket;

      render(
        <WebSocketProvider>
          <TestChatComponent />
        </WebSocketProvider>
      );

      const connectButton = screen.getByTestId('connect-button');
      
      await act(async () => {
        await userEvent.click(connectButton);
      });

      // Should remain disconnected due to error
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected');
      });

      // Restore original WebSocket
      (global as any).WebSocket = MockWebSocket;
    });

    test('handles message sending failures', async () => {
      // Mock WebSocket that accepts connection but fails message sending
      const MessageFailingWebSocket = class extends MockWebSocket {
        send(data: string) {
          // Don't send any response - simulate message failure
          console.log('Message send simulated failure:', data);
        }
      };

      (global as any).WebSocket = MessageFailingWebSocket;

      render(
        <WebSocketProvider>
          <TestChatComponent />
        </WebSocketProvider>
      );

      // Connect first
      const connectButton = screen.getByTestId('connect-button');
      await act(async () => {
        await userEvent.click(connectButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-connected')).toHaveTextContent('Connected: Yes');
      });

      // Try to send a message
      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');

      await act(async () => {
        await userEvent.type(messageInput, 'This message will fail');
        await userEvent.click(sendButton);
      });

      // Message should not appear (since it failed)
      await waitFor(() => {
        const messagesContainer = screen.getByTestId('messages');
        expect(messagesContainer).toBeEmptyDOMElement();
      });

      // Restore original WebSocket
      (global as any).WebSocket = MockWebSocket;
    });
  });

  describe('Cross-Component Integration', () => {
    test('WebSocket context provides data to multiple components', async () => {
      const SecondComponent: React.FC = () => {
        const { messages, isConnected } = useWebSocket();
        
        return (
          <div>
            <div data-testid="second-component-status">
              Second Component Connected: {isConnected ? 'Yes' : 'No'}
            </div>
            <div data-testid="second-component-messages">
              Messages in second component: {messages.length}
            </div>
          </div>
        );
      };

      render(
        <WebSocketProvider>
          <TestChatComponent />
          <SecondComponent />
        </WebSocketProvider>
      );

      // Connect
      const connectButton = screen.getByTestId('connect-button');
      await act(async () => {
        await userEvent.click(connectButton);
      });

      // Both components should show connected
      await waitFor(() => {
        expect(screen.getByTestId('is-connected')).toHaveTextContent('Connected: Yes');
        expect(screen.getByTestId('second-component-status')).toHaveTextContent('Second Component Connected: Yes');
      });

      // Send a message
      const messageInput = screen.getByTestId('message-input');
      const sendButton = screen.getByTestId('send-button');

      await act(async () => {
        await userEvent.type(messageInput, 'Shared message');
        await userEvent.click(sendButton);
      });

      // Both components should see the message
      await waitFor(() => {
        expect(screen.getByTestId('message-0')).toHaveTextContent('Shared message');
        expect(screen.getByTestId('second-component-messages')).toHaveTextContent('Messages in second component: 1');
      });
    });
  });
});