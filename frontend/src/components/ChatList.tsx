import React, { useState, useMemo } from 'react';
import { ChatRoom, User, Message } from '../types/index';
import './ChatList.css';

interface ChatListProps {
  chatRooms: ChatRoom[];
  contacts: User[];
  currentUserId: string;
  selectedChatRoomId?: string;
  onChatRoomSelect: (chatRoom: ChatRoom) => void;
  onDeleteChat: (chatRoomId: string) => void;
  onBlockUser: (userId: string) => void;
  getLastMessage: (chatRoomId: string) => Message | undefined;
  getUnreadCount: (chatRoomId: string) => number;
}

const ChatList: React.FC<ChatListProps> = ({
  chatRooms,
  contacts,
  currentUserId,
  selectedChatRoomId,
  onChatRoomSelect,
  onDeleteChat,
  onBlockUser,
  getLastMessage,
  getUnreadCount
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState<string | null>(null);

  // Sort chat rooms by last message time (most recent first)
  const sortedChatRooms = useMemo(() => {
    return [...chatRooms].sort((a, b) => {
      const lastMessageA = getLastMessage(a.id);
      const lastMessageB = getLastMessage(b.id);
      
      const timeA = lastMessageA ? lastMessageA.timestamp.getTime() : a.lastMessageAt.getTime();
      const timeB = lastMessageB ? lastMessageB.timestamp.getTime() : b.lastMessageAt.getTime();
      
      return timeB - timeA; // Most recent first
    });
  }, [chatRooms, getLastMessage]);

  // Filter chat rooms based on search term
  const filteredChatRooms = useMemo(() => {
    if (!searchTerm.trim()) return sortedChatRooms;

    return sortedChatRooms.filter(chatRoom => {
      // Search in chat room name
      if (chatRoom.name && chatRoom.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return true;
      }

      // Search in participant names (for direct chats)
      if (chatRoom.type === 'direct') {
        const otherUserId = chatRoom.participants.find(id => id !== currentUserId);
        const otherUser = contacts.find(contact => contact.id === otherUserId);
        if (otherUser && otherUser.username.toLowerCase().includes(searchTerm.toLowerCase())) {
          return true;
        }
      }

      // Search in last message content
      const lastMessage = getLastMessage(chatRoom.id);
      if (lastMessage && lastMessage.content.toLowerCase().includes(searchTerm.toLowerCase())) {
        return true;
      }

      return false;
    });
  }, [sortedChatRooms, searchTerm, currentUserId, contacts, getLastMessage]);

  const getChatDisplayName = (chatRoom: ChatRoom): string => {
    if (chatRoom.name) return chatRoom.name;
    
    if (chatRoom.type === 'direct') {
      const otherUserId = chatRoom.participants.find(id => id !== currentUserId);
      const otherUser = contacts.find(contact => contact.id === otherUserId);
      return otherUser?.username || 'Unknown User';
    }
    
    return 'Group Chat';
  };

  const getChatAvatar = (chatRoom: ChatRoom): string => {
    const displayName = getChatDisplayName(chatRoom);
    return displayName.charAt(0).toUpperCase();
  };

  const formatMessageTime = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    
    return timestamp.toLocaleDateString();
  };

  const handleDeleteChat = (chatRoomId: string) => {
    onDeleteChat(chatRoomId);
    setShowDeleteConfirm(null);
  };

  const handleBlockUser = (chatRoom: ChatRoom) => {
    if (chatRoom.type === 'direct') {
      const otherUserId = chatRoom.participants.find(id => id !== currentUserId);
      if (otherUserId) {
        onBlockUser(otherUserId);
        setShowBlockConfirm(null);
      }
    }
  };



  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <h3>Chats</h3>
      </div>

      <div className="search-container">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search chats..."
          className="search-input"
        />
      </div>

      <div className="chats-container">
        {filteredChatRooms.length === 0 ? (
          <div className="no-chats">
            {searchTerm ? 'No chats found' : 'No chats yet'}
          </div>
        ) : (
          filteredChatRooms.map((chatRoom) => {
            const lastMessage = getLastMessage(chatRoom.id);
            const unreadCount = getUnreadCount(chatRoom.id);
            const isSelected = selectedChatRoomId === chatRoom.id;

            return (
              <div
                key={chatRoom.id}
                className={`chat-item ${isSelected ? 'selected' : ''}`}
              >
                <div
                  className="chat-item-content"
                  onClick={() => onChatRoomSelect(chatRoom)}
                >
                  <div className="chat-avatar">
                    <div className="avatar-circle">
                      {getChatAvatar(chatRoom)}
                    </div>
                    {unreadCount > 0 && (
                      <div className="unread-badge">{unreadCount}</div>
                    )}
                  </div>
                  
                  <div className="chat-info">
                    <div className="chat-header-row">
                      <div className="chat-name">{getChatDisplayName(chatRoom)}</div>
                      {lastMessage && (
                        <div className="message-time">
                          {formatMessageTime(lastMessage.timestamp)}
                        </div>
                      )}
                    </div>
                    
                    <div className="last-message">
                      {lastMessage ? (
                        <span className={unreadCount > 0 ? 'unread' : ''}>
                          {lastMessage.senderId === currentUserId ? 'You: ' : ''}
                          {lastMessage.content}
                        </span>
                      ) : (
                        <span className="no-messages">No messages yet</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="chat-actions">
                  <button
                    className="action-btn delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(chatRoom.id);
                    }}
                    title="Delete chat"
                  >
                    🗑️
                  </button>
                  
                  {chatRoom.type === 'direct' && (
                    <button
                      className="action-btn block-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBlockConfirm(chatRoom.id);
                      }}
                      title="Block user"
                    >
                      🚫
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Chat</h3>
            <p>
              Are you sure you want to delete this chat? This will remove the conversation 
              from your view but won't affect other participants.
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => handleDeleteChat(showDeleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block User Confirmation Modal */}
      {showBlockConfirm && (
        <div className="modal-overlay" onClick={() => setShowBlockConfirm(null)}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Block User</h3>
            <p>
              Are you sure you want to block this user? You won't receive messages 
              from them and they won't receive messages from you.
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowBlockConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  const chatRoom = chatRooms.find(cr => cr.id === showBlockConfirm);
                  if (chatRoom) handleBlockUser(chatRoom);
                }}
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatList;