// WebSocket context tests
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { WebSocketProvider, useWebSocket } from '../WebSocketContext';

// Mock WebSocket
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
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string) {
    // Mock send
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: code || 1000, reason: reason || '' }));
    }
  }
}

(global as any).WebSocket = MockWebSocket;

// Test component that uses WebSocket context
const TestComponent: React.FC = () => {
  const { isConnected, connectionStatus, sendMessage } = useWebSocket();
  
  return (
    <div>
      <div data-testid="connection-status">{connectionStatus}</div>
      <div data-testid="is-connected">{isConnected.toString()}</div>
      <button 
        onClick={() => sendMessage('test', 'room1', 'user1')}
        data-testid="send-button"
      >
        Send Message
      </button>
    </div>
  );
};

describe('WebSocketContext', () => {
  test('should provide WebSocket context to children', () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected');
    expect(screen.getByTestId('is-connected')).toHaveTextContent('false');
  });

  test('should connect when connect is called', async () => {
    const ConnectingComponent: React.FC = () => {
      const { connect, connectionStatus } = useWebSocket();
      
      React.useEffect(() => {
        connect('test-token');
      }, [connect]);
      
      return <div data-testid="status">{connectionStatus}</div>;
    };

    render(
      <WebSocketProvider>
        <ConnectingComponent />
      </WebSocketProvider>
    );

    // Initially disconnected
    expect(screen.getByTestId('status')).toHaveTextContent('connecting');

    // Wait for connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(screen.getByTestId('status')).toHaveTextContent('connected');
  });

  test('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useWebSocket must be used within a WebSocketProvider');
    
    consoleSpy.mockRestore();
  });
});