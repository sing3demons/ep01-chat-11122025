// Main entry point for the React frontend
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import ChatInterface from './components/ChatInterface';
import ProtectedRoute from './components/ProtectedRoute';
import { WebSocketProvider, useWebSocket } from './contexts/WebSocketContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatRoom } from './types/index';

// Inner App component that uses WebSocket and Auth contexts
const AppContent: React.FC = () => {
  const [selectedChatRoom, setSelectedChatRoom] = useState<ChatRoom | undefined>();
  const { connect } = useWebSocket();
  const { user, token, isAuthenticated } = useAuth();

  // Connect to WebSocket when authenticated
  useEffect(() => {
    if (isAuthenticated && token && user) {
      connect(token).catch(error => {
        console.error('Failed to connect to WebSocket:', error);
      });
    }
  }, [connect, isAuthenticated, token, user]);

  const handleChatRoomSelect = (chatRoom: ChatRoom) => {
    setSelectedChatRoom(chatRoom);
  };

  // Only render ChatInterface if user is authenticated and available
  if (!user) {
    return null;
  }

  return (
    <div className="App">
      <ChatInterface
        currentUser={user}
        selectedChatRoom={selectedChatRoom}
        onChatRoomSelect={handleChatRoomSelect}
      />
    </div>
  );
};

// Main App component with all providers
const App: React.FC = () => {
  return (
    <AuthProvider>
      <WebSocketProvider url="ws://localhost:3001">
        <ProtectedRoute>
          <AppContent />
        </ProtectedRoute>
      </WebSocketProvider>
    </AuthProvider>
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