import React from 'react';
import { render } from '@testing-library/react';
import { ChatInterface, MessageList, MessageInput, ContactList } from '../index';
import { WebSocketProvider } from '../../contexts/WebSocketContext';
import { User, ChatRoom, Message, TypingIndicator } from '../../types/index.ts 22-32-13-426';

// Mock data for testing component imports
const mockUser: User = {
  id: '1',
  username: 'Test User',
  email: 'test@example.com',
  isOnline: true,
  lastSeen: new Date()
};

const mockChatRoom: ChatRoom = {
  id: '1',
  type: 'direct',
  participants: ['1', '2'],
  createdAt: new Date(),
  lastMessageAt: new Date()
};

const mockMessages: Message[] = [
  {
    id: '1',
    content: 'Hello',
    senderId: '1',
    chatRoomId: '1',
    timestamp: new Date(),
    status: 'sent'
  }
];

const mockTypingIndicators: TypingIndicator[] = [];

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CLOSED;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {}
  send(data: string) {}
  close(code?: number, reason?: string) {}
}

(global as any).WebSocket = MockWebSocket;

describe('Component Exports', () => {
  test('ChatInterface can be imported and rendered', () => {
    const { container } = render(
      <WebSocketProvider>
        <ChatInterface
          currentUser={mockUser}
          selectedChatRoom={mockChatRoom}
          onChatRoomSelect={jest.fn()}
        />
      </WebSocketProvider>
    );
    expect(container).toBeInTheDocument();
  });

  test('MessageList can be imported and rendered', () => {
    const { container } = render(
      <MessageList
        messages={mockMessages}
        currentUserId="1"
        typingIndicators={mockTypingIndicators}
        onMessageStatusUpdate={jest.fn()}
      />
    );
    expect(container).toBeInTheDocument();
  });

  test('MessageInput can be imported and rendered', () => {
    const { container } = render(
      <MessageInput
        chatRoomId="1"
        currentUserId="1"
        onSendMessage={jest.fn()}
        onTypingStart={jest.fn()}
        onTypingStop={jest.fn()}
      />
    );
    expect(container).toBeInTheDocument();
  });

  test('ContactList can be imported and rendered', () => {
    const { container } = render(
      <ContactList
        contacts={[mockUser]}
        onContactSelect={jest.fn()}
        onAddContact={jest.fn()}
      />
    );
    expect(container).toBeInTheDocument();
  });
});