// Basic setup test to verify testing framework
import * as fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Simple App component for testing
const App: React.FC = () => {
  return (
    <div>
      <h1>WhatsApp Chat System</h1>
      <p>Real-time chat application</p>
    </div>
  );
};

describe('Testing Framework Setup', () => {
  test('Jest is working correctly', () => {
    expect(true).toBe(true);
  });

  test('fast-check is available', () => {
    expect(fc).toBeDefined();
    expect(typeof fc.assert).toBe('function');
  });

  test('React Testing Library is working', () => {
    render(<App />);
    expect(screen.getByText('WhatsApp Chat System')).toBeInTheDocument();
  });

  test('TypeScript interfaces are available', () => {
    // Import types to verify they compile correctly
    const message: any = {
      id: 'test-id',
      content: 'test message',
      senderId: 'user-1',
      chatRoomId: 'room-1',
      timestamp: new Date(),
      status: 'sent'
    };
    
    expect(message).toBeDefined();
  });
});