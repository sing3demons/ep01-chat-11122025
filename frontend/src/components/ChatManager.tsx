import React, { useState, useMemo } from 'react';
import { ChatRoom, User, Message } from '../types/index';
import ChatList from './ChatList';
import BlockedUsers from './BlockedUsers';
import './ChatManager.css';

interface ChatManagerProps {
  chatRooms: ChatRoom[];
  contacts: User[];
  blockedUsers: User[];
  messages: Message[];
  currentUserId: string;
  selectedChatRoomId?: string;
  onChatRoomSelect: (chatRoom: ChatRoom) => void;
  onDeleteChat: (chatRoomId: string) => void;
  onBlockUser: (userId: string) => void;
  onUnblockUser: (userId: string) => void;
}

const ChatManager: React.FC<ChatManagerProps> = ({
  chatRooms,
  contacts,
  blockedUsers,
  messages,
  currentUserId,
  selectedChatRoomId,
  onChatRoomSelect,
  onDeleteChat,
  onBlockUser,
  onUnblockUser
}) => {
  const [activeTab, setActiveTab] = useState<'chats' | 'blocked'>('chats');

  // Helper function to get the last message for a chat room
  const getLastMessage = (chatRoomId: string): Message | undefined => {
    const chatMessages = messages
      .filter(msg => msg.chatRoomId === chatRoomId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return chatMessages[0];
  };

  // Helper function to get unread message count for a chat room
  const getUnreadCount = (chatRoomId: string): number => {
    return messages.filter(msg => 
      msg.chatRoomId === chatRoomId && 
      msg.senderId !== currentUserId && 
      msg.status !== 'read'
    ).length;
  };

  // Filter out chats with blocked users
  const filteredChatRooms = useMemo(() => {
    const blockedUserIds = new Set(blockedUsers.map(user => user.id));
    
    return chatRooms.filter(chatRoom => {
      if (chatRoom.type === 'direct') {
        // For direct chats, check if the other user is blocked
        const otherUserId = chatRoom.participants.find(id => id !== currentUserId);
        return otherUserId && !blockedUserIds.has(otherUserId);
      }
      
      // For group chats, always show (blocking is handled at message level)
      return true;
    });
  }, [chatRooms, blockedUsers, currentUserId]);

  return (
    <div className="chat-manager">
      <div className="chat-manager-tabs">
        <button
          className={`tab-button ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
        >
          Chats
          {filteredChatRooms.length > 0 && (
            <span className="tab-count">{filteredChatRooms.length}</span>
          )}
        </button>
        <button
          className={`tab-button ${activeTab === 'blocked' ? 'active' : ''}`}
          onClick={() => setActiveTab('blocked')}
        >
          Blocked
          {blockedUsers.length > 0 && (
            <span className="tab-count">{blockedUsers.length}</span>
          )}
        </button>
      </div>

      <div className="chat-manager-content">
        {activeTab === 'chats' ? (
          <ChatList
            chatRooms={filteredChatRooms}
            contacts={contacts}
            currentUserId={currentUserId}
            selectedChatRoomId={selectedChatRoomId}
            onChatRoomSelect={onChatRoomSelect}
            onDeleteChat={onDeleteChat}
            onBlockUser={onBlockUser}
            getLastMessage={getLastMessage}
            getUnreadCount={getUnreadCount}
          />
        ) : (
          <BlockedUsers
            blockedUsers={blockedUsers}
            onUnblockUser={onUnblockUser}
          />
        )}
      </div>
    </div>
  );
};

export default ChatManager;