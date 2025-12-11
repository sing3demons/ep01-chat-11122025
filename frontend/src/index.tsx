// Main entry point for the React frontend
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import ChatInterface from './components/ChatInterface';
import { WebSocketProvider, useWebSocket } from './contexts/WebSocketContext';
import { User, ChatRoom } from './types/index.ts 22-32-13-426';

// Inner App component that uses WebSocket context
const AppContent: React.FC = () => {
  const [selectedChatRoom, setSelectedChatRoom] = useState<ChatRoom | undefined>();
  const { connect } = useWebSocket();

  // Mock current user data
  const currentUser: User = {
    id: '1',
    username: 'John Doe',
    email: 'john@example.com',
    isOnline: true,
    lastSeen: new Date()
  };

  // Connect to WebSocket on app start
  useEffect(() => {
    // TODO: Get JWT token from authentication system
    const mockToken = 'mock-jwt-token';
    connect(mockToken).catch(error => {
      console.error('Failed to connect to WebSocket:', error);
    });
  }, [connect]);

  const handleChatRoomSelect = (chatRoom: ChatRoom) => {
    setSelectedChatRoom(chatRoom);
  };

  return (
    <div className="App">
      <ChatInterface
        currentUser={currentUser}
        selectedChatRoom={selectedChatRoom}
        onChatRoomSelect={handleChatRoomSelect}
      />
    </div>
  );
};

// Main App component with WebSocket provider
const App: React.FC = () => {
  return (
    <WebSocketProvider url="ws://localhost:3001">
      <AppContent />
    </WebSocketProvider>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

export default App;