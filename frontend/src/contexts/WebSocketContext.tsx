// WebSocket React Context for managing WebSocket state across components
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { websocketService, WebSocketEventHandlers } from '../services/websocket.service';
import { Message, TypingIndicator, User, ConnectionStatus } from '../types/index.ts 22-32-13-426';

interface WebSocketContextType {
  // Connection state
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  reconnectAttempts: number;
  
  // Real-time data
  messages: Message[];
  typingIndicators: TypingIndicator[];
  onlineUsers: User[];
  
  // Actions
  sendMessage: (content: string, chatRoomId: string, senderId: string) => boolean;
  sendTyping: (chatRoomId: string, userId: string, isTyping: boolean) => boolean;
  sendMessageStatus: (messageId: string, status: 'delivered' | 'read') => boolean;
  connect: (token?: string) => Promise<void>;
  disconnect: () => void;
  
  // Event handlers
  onMessage: (handler: (message: Message) => void) => void;
  onTyping: (handler: (indicator: TypingIndicator) => void) => void;
  onUserStatusUpdate: (handler: (user: User) => void) => void;
  onMessageStatusUpdate: (handler: (messageId: string, status: 'delivered' | 'read') => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  url?: string;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  url = 'ws://localhost:3001' 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  // Event handler callbacks
  const [messageHandlers, setMessageHandlers] = useState<((message: Message) => void)[]>([]);
  const [typingHandlers, setTypingHandlers] = useState<((indicator: TypingIndicator) => void)[]>([]);
  const [userStatusHandlers, setUserStatusHandlers] = useState<((user: User) => void)[]>([]);
  const [messageStatusHandlers, setMessageStatusHandlers] = useState<((messageId: string, status: 'delivered' | 'read') => void)[]>([]);

  // Handle incoming messages
  const handleMessage = useCallback((message: Message) => {
    setMessages(prev => {
      // Avoid duplicates
      if (prev.some(m => m.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
    
    // Notify external handlers
    messageHandlers.forEach(handler => handler(message));
  }, [messageHandlers]);

  // Handle typing indicators
  const handleTyping = useCallback((indicator: TypingIndicator) => {
    setTypingIndicators(prev => {
      const filtered = prev.filter(
        t => !(t.userId === indicator.userId && t.chatRoomId === indicator.chatRoomId)
      );
      
      if (indicator.isTyping) {
        return [...filtered, indicator];
      }
      return filtered;
    });
    
    // Notify external handlers
    typingHandlers.forEach(handler => handler(indicator));
  }, [typingHandlers]);

  // Handle user status updates
  const handleUserStatusUpdate = useCallback((user: User) => {
    setOnlineUsers(prev => {
      const filtered = prev.filter(u => u.id !== user.id);
      if (user.isOnline) {
        return [...filtered, user];
      }
      return filtered;
    });
    
    // Notify external handlers
    userStatusHandlers.forEach(handler => handler(user));
  }, [userStatusHandlers]);

  // Handle message status updates
  const handleMessageStatusUpdate = useCallback((messageId: string, status: 'delivered' | 'read') => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, status } : msg
      )
    );
    
    // Notify external handlers
    messageStatusHandlers.forEach(handler => handler(messageId, status));
  }, [messageStatusHandlers]);

  // Handle connection status changes
  const handleConnectionStatusChange = useCallback((status: ConnectionStatus) => {
    setIsConnected(status.isConnected);
    setReconnectAttempts(status.reconnectAttempts);
    
    if (status.isConnected) {
      setConnectionStatus('connected');
    } else if (status.reconnectAttempts > 0) {
      setConnectionStatus('reconnecting');
    } else {
      setConnectionStatus('disconnected');
    }
  }, []);

  // Initialize WebSocket service
  useEffect(() => {
    const handlers: WebSocketEventHandlers = {
      onMessage: handleMessage,
      onTyping: handleTyping,
      onUserStatusUpdate: handleUserStatusUpdate,
      onMessageStatusUpdate: handleMessageStatusUpdate,
      onConnectionStatusChange: handleConnectionStatusChange
    };

    websocketService.setHandlers(handlers);

    return () => {
      websocketService.disconnect();
    };
  }, [handleMessage, handleTyping, handleUserStatusUpdate, handleMessageStatusUpdate, handleConnectionStatusChange]);

  // Connect to WebSocket
  const connect = useCallback(async (token?: string) => {
    try {
      setConnectionStatus('connecting');
      if (token) {
        websocketService.setToken(token);
      }
      await websocketService.connect();
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setConnectionStatus('disconnected');
    }
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    websocketService.disconnect();
    setConnectionStatus('disconnected');
  }, []);

  // Send message
  const sendMessage = useCallback((content: string, chatRoomId: string, senderId: string) => {
    return websocketService.sendMessage(content, chatRoomId, senderId);
  }, []);

  // Send typing indicator
  const sendTyping = useCallback((chatRoomId: string, userId: string, isTyping: boolean) => {
    return websocketService.sendTyping(chatRoomId, userId, isTyping);
  }, []);

  // Send message status
  const sendMessageStatus = useCallback((messageId: string, status: 'delivered' | 'read') => {
    return websocketService.sendMessageStatus(messageId, status);
  }, []);

  // Register event handlers
  const onMessage = useCallback((handler: (message: Message) => void) => {
    setMessageHandlers(prev => [...prev, handler]);
  }, []);

  const onTyping = useCallback((handler: (indicator: TypingIndicator) => void) => {
    setTypingHandlers(prev => [...prev, handler]);
  }, []);

  const onUserStatusUpdate = useCallback((handler: (user: User) => void) => {
    setUserStatusHandlers(prev => [...prev, handler]);
  }, []);

  const onMessageStatusUpdate = useCallback((handler: (messageId: string, status: 'delivered' | 'read') => void) => {
    setMessageStatusHandlers(prev => [...prev, handler]);
  }, []);

  const contextValue: WebSocketContextType = {
    isConnected,
    connectionStatus,
    reconnectAttempts,
    messages,
    typingIndicators,
    onlineUsers,
    sendMessage,
    sendTyping,
    sendMessageStatus,
    connect,
    disconnect,
    onMessage,
    onTyping,
    onUserStatusUpdate,
    onMessageStatusUpdate
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook to use WebSocket context
export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;