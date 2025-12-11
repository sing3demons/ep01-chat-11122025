import React, { useState, useEffect } from 'react';
import { ChatInterfaceProps } from '../interfaces/components';
import { ChatRoom, Message, TypingIndicator, User } from '../types/index.ts 22-32-13-426';
import { useWebSocket } from '../contexts/WebSocketContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ContactList from './ContactList';
import ConnectionStatus from './ConnectionStatus';
import GroupManager from './GroupManager';
import './ChatInterface.css';

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  currentUser,
  selectedChatRoom,
  onChatRoomSelect
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([]);
  const [contacts, setContacts] = useState<User[]>([]);
  const [showGroupManager, setShowGroupManager] = useState(false);
  
  // WebSocket integration
  const { 
    isConnected, 
    sendMessage: wsSendMessage, 
    sendTyping, 
    sendMessageStatus,
    onMessage,
    onTyping,
    onUserStatusUpdate,
    onMessageStatusUpdate
  } = useWebSocket();

  // Initialize WebSocket event handlers
  useEffect(() => {
    // Handle incoming messages
    onMessage((message: Message) => {
      setMessages(prev => {
        // Avoid duplicates and only show messages for current chat room
        if (selectedChatRoom && message.chatRoomId === selectedChatRoom.id) {
          if (!prev.some(m => m.id === message.id)) {
            return [...prev, message];
          }
        }
        return prev;
      });
    });

    // Handle typing indicators
    onTyping((indicator: TypingIndicator) => {
      if (selectedChatRoom && indicator.chatRoomId === selectedChatRoom.id) {
        setTypingIndicators(prev => {
          const filtered = prev.filter(
            t => !(t.userId === indicator.userId && t.chatRoomId === indicator.chatRoomId)
          );
          
          if (indicator.isTyping) {
            return [...filtered, indicator];
          }
          return filtered;
        });
      }
    });

    // Handle user status updates
    onUserStatusUpdate((user: User) => {
      setContacts(prev => 
        prev.map(contact => 
          contact.id === user.id 
            ? { ...contact, isOnline: user.isOnline, lastSeen: user.lastSeen }
            : contact
        )
      );
    });

    // Handle message status updates
    onMessageStatusUpdate((messageId: string, status: 'delivered' | 'read') => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, status } : msg
        )
      );
    });
  }, [selectedChatRoom, onMessage, onTyping, onUserStatusUpdate, onMessageStatusUpdate]);

  // Mock data for development (fallback when WebSocket is not connected)
  useEffect(() => {
    // Mock contacts data
    setContacts([
      {
        id: '2',
        username: 'Alice Johnson',
        email: 'alice@example.com',
        isOnline: true,
        lastSeen: new Date()
      },
      {
        id: '3',
        username: 'Bob Smith',
        email: 'bob@example.com',
        isOnline: false,
        lastSeen: new Date(Date.now() - 300000) // 5 minutes ago
      }
    ]);

    // Mock messages data if chat room is selected and not connected to WebSocket
    if (selectedChatRoom && !isConnected) {
      setMessages([
        {
          id: '1',
          content: 'Hello! How are you?',
          senderId: '2',
          chatRoomId: selectedChatRoom.id,
          timestamp: new Date(Date.now() - 600000), // 10 minutes ago
          status: 'read'
        },
        {
          id: '2',
          content: 'I\'m doing great, thanks for asking!',
          senderId: currentUser.id,
          chatRoomId: selectedChatRoom.id,
          timestamp: new Date(Date.now() - 300000), // 5 minutes ago
          status: 'delivered'
        }
      ]);
    }
  }, [selectedChatRoom, currentUser.id, isConnected]);

  // Clear messages when chat room changes
  useEffect(() => {
    if (selectedChatRoom) {
      setMessages([]);
      setTypingIndicators([]);
      // TODO: Load chat history from API
    }
  }, [selectedChatRoom]);

  const handleSendMessage = (content: string) => {
    if (!selectedChatRoom) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      senderId: currentUser.id,
      chatRoomId: selectedChatRoom.id,
      timestamp: new Date(),
      status: 'sent'
    };

    // Add message to local state immediately for optimistic UI
    setMessages(prev => [...prev, newMessage]);
    
    // Send message via WebSocket if connected
    if (isConnected) {
      const success = wsSendMessage(content, selectedChatRoom.id, currentUser.id);
      
      if (!success) {
        // Mark message as failed if WebSocket send failed
        setTimeout(() => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === newMessage.id 
                ? { ...msg, status: 'sent' as const } // Keep as sent, will retry
                : msg
            )
          );
        }, 100);
      }
    } else {
      // Fallback: simulate message delivery for offline mode
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === newMessage.id 
              ? { ...msg, status: 'delivered' as const }
              : msg
          )
        );
      }, 1000);
    }
  };

  const handleTypingStart = () => {
    if (!selectedChatRoom) return;
    
    // Send typing indicator via WebSocket if connected
    if (isConnected) {
      sendTyping(selectedChatRoom.id, currentUser.id, true);
    }
    
    // Update local state for immediate feedback
    const typingIndicator: TypingIndicator = {
      userId: currentUser.id,
      chatRoomId: selectedChatRoom.id,
      isTyping: true
    };
    
    setTypingIndicators(prev => [
      ...prev.filter(t => t.userId !== currentUser.id || t.chatRoomId !== selectedChatRoom.id),
      typingIndicator
    ]);
  };

  const handleTypingStop = () => {
    if (!selectedChatRoom) return;
    
    // Send typing stop via WebSocket if connected
    if (isConnected) {
      sendTyping(selectedChatRoom.id, currentUser.id, false);
    }
    
    // Update local state
    setTypingIndicators(prev => 
      prev.filter(t => !(t.userId === currentUser.id && t.chatRoomId === selectedChatRoom.id))
    );
  };

  const handleMessageStatusUpdate = (messageId: string, status: 'delivered' | 'read') => {
    // Send status update via WebSocket if connected
    if (isConnected) {
      sendMessageStatus(messageId, status);
    }
    
    // Update local state
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, status } : msg
      )
    );
  };

  const handleContactSelect = (contact: User) => {
    // Create or find direct chat room with selected contact
    const chatRoom: ChatRoom = {
      id: `direct_${currentUser.id}_${contact.id}`,
      type: 'direct',
      participants: [currentUser.id, contact.id],
      createdAt: new Date(),
      lastMessageAt: new Date()
    };
    
    onChatRoomSelect(chatRoom);
  };

  const handleAddContact = (email: string) => {
    // Mock add contact functionality
    console.log('Adding contact:', email);
  };

  // Group management functions
  const handleCreateGroup = async (name: string, participants: string[]) => {
    try {
      // Mock API call - in real app, this would call the backend API
      const newGroupId = `group_${Date.now()}`;
      const newGroup: ChatRoom = {
        id: newGroupId,
        name,
        type: 'group',
        participants,
        createdAt: new Date(),
        lastMessageAt: new Date()
      };
      
      console.log('Creating group:', newGroup);
      
      // Select the new group
      onChatRoomSelect(newGroup);
      setShowGroupManager(false);
      
      // In real app, would send WebSocket message to notify participants
      if (isConnected) {
        // wsSendMessage would handle group creation notification
      }
    } catch (error) {
      console.error('Failed to create group:', error);
      throw error;
    }
  };

  const handleAddMember = async (chatRoomId: string, userId: string) => {
    try {
      console.log('Adding member to group:', chatRoomId, userId);
      // Mock API call - in real app, this would call the backend API
      // In real app, would send WebSocket message to notify group members
    } catch (error) {
      console.error('Failed to add member:', error);
      throw error;
    }
  };

  const handleRemoveMember = async (chatRoomId: string, userId: string) => {
    try {
      console.log('Removing member from group:', chatRoomId, userId);
      // Mock API call - in real app, this would call the backend API
      // In real app, would send WebSocket message to notify group members
    } catch (error) {
      console.error('Failed to remove member:', error);
      throw error;
    }
  };

  const handleUpdateRole = async (chatRoomId: string, userId: string, role: 'admin' | 'member') => {
    try {
      console.log('Updating member role:', chatRoomId, userId, role);
      // Mock API call - in real app, this would call the backend API
      // In real app, would send WebSocket message to notify group members
    } catch (error) {
      console.error('Failed to update member role:', error);
      throw error;
    }
  };

  const handleUpdateGroup = async (chatRoomId: string, name: string) => {
    try {
      console.log('Updating group:', chatRoomId, name);
      // Mock API call - in real app, this would call the backend API
      
      // Update local state
      if (selectedChatRoom && selectedChatRoom.id === chatRoomId) {
        const updatedChatRoom = { ...selectedChatRoom, name };
        onChatRoomSelect(updatedChatRoom);
      }
      
      // In real app, would send WebSocket message to notify group members
    } catch (error) {
      console.error('Failed to update group:', error);
      throw error;
    }
  };

  const handleLeaveGroup = async (chatRoomId: string) => {
    try {
      console.log('Leaving group:', chatRoomId);
      // Mock API call - in real app, this would call the backend API
      
      // Clear selected chat room if leaving current group
      if (selectedChatRoom && selectedChatRoom.id === chatRoomId) {
        onChatRoomSelect(undefined as any);
      }
      
      setShowGroupManager(false);
      
      // In real app, would send WebSocket message to notify group members
    } catch (error) {
      console.error('Failed to leave group:', error);
      throw error;
    }
  };

  const handleDeleteGroup = async (chatRoomId: string) => {
    try {
      console.log('Deleting group:', chatRoomId);
      // Mock API call - in real app, this would call the backend API
      
      // Clear selected chat room if deleting current group
      if (selectedChatRoom && selectedChatRoom.id === chatRoomId) {
        onChatRoomSelect(undefined as any);
      }
      
      setShowGroupManager(false);
      
      // In real app, would send WebSocket message to notify group members
    } catch (error) {
      console.error('Failed to delete group:', error);
      throw error;
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-sidebar">
        <div className="user-info">
          <div className="user-avatar">
            {currentUser.username.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <h3>{currentUser.username}</h3>
            <span className={`status ${currentUser.isOnline ? 'online' : 'offline'}`}>
              {currentUser.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <ConnectionStatus className="compact" />
        </div>
        
        <ContactList
          contacts={contacts}
          onContactSelect={handleContactSelect}
          onAddContact={handleAddContact}
          selectedContactId={selectedChatRoom?.participants.find((id: string) => id !== currentUser.id)}
        />
        
        <div className="group-management">
          <button 
            className="manage-groups-btn"
            onClick={() => setShowGroupManager(true)}
            disabled={!isConnected}
          >
            Manage Groups
          </button>
        </div>
      </div>

      <div className="chat-main">
        {selectedChatRoom ? (
          <>
            <div className="chat-header">
              <h2>
                {selectedChatRoom.name || 
                  contacts.find((c: User) => 
                    selectedChatRoom.participants.includes(c.id) && c.id !== currentUser.id
                  )?.username || 'Chat'
                }
              </h2>
              {selectedChatRoom.type === 'group' && (
                <button 
                  className="group-settings-btn"
                  onClick={() => setShowGroupManager(true)}
                  disabled={!isConnected}
                  title="Group Settings"
                >
                  ⚙️
                </button>
              )}
            </div>
            
            <MessageList
              messages={messages}
              currentUserId={currentUser.id}
              typingIndicators={typingIndicators}
              onMessageStatusUpdate={handleMessageStatusUpdate}
            />
            
            <MessageInput
              chatRoomId={selectedChatRoom.id}
              currentUserId={currentUser.id}
              onSendMessage={handleSendMessage}
              onTypingStart={handleTypingStart}
              onTypingStop={handleTypingStop}
              disabled={!isConnected}
            />
          </>
        ) : (
          <div className="no-chat-selected">
            <h2>Select a contact to start chatting</h2>
            <p>Choose a contact from the sidebar to begin a conversation</p>
          </div>
        )}
      </div>

      {/* Group Manager Modal */}
      {showGroupManager && (
        <div className="modal-overlay" onClick={() => setShowGroupManager(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Group Management</h2>
              <button 
                className="modal-close"
                onClick={() => setShowGroupManager(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <GroupManager
                chatRoom={selectedChatRoom?.type === 'group' ? selectedChatRoom : undefined}
                currentUserId={currentUser.id}
                onCreateGroup={handleCreateGroup}
                onAddMember={handleAddMember}
                onRemoveMember={handleRemoveMember}
                onUpdateRole={handleUpdateRole}
                onUpdateGroup={handleUpdateGroup}
                onLeaveGroup={handleLeaveGroup}
                onDeleteGroup={handleDeleteGroup}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;