// Component interface definitions

import { Message, User, ChatRoom, Notification, NotificationSettings, TypingIndicator } from '../types/index.ts 22-32-13-426';

export interface ChatInterfaceProps {
  currentUser: User;
  selectedChatRoom?: ChatRoom;
  onChatRoomSelect: (chatRoom: ChatRoom) => void;
}

export interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  typingIndicators: TypingIndicator[];
  onMessageStatusUpdate: (messageId: string, status: 'delivered' | 'read') => void;
}

export interface MessageInputProps {
  chatRoomId: string;
  currentUserId: string;
  onSendMessage: (content: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  disabled?: boolean;
}

export interface ContactListProps {
  contacts: User[];
  onContactSelect: (contact: User) => void;
  onAddContact: (email: string) => void;
  selectedContactId?: string;
}

export interface GroupManagerProps {
  chatRoom?: ChatRoom;
  currentUserId: string;
  onCreateGroup: (name: string, participants: string[]) => void;
  onAddMember: (chatRoomId: string, userId: string) => void;
  onRemoveMember: (chatRoomId: string, userId: string) => void;
  onUpdateRole: (chatRoomId: string, userId: string, role: 'admin' | 'member') => void;
  onUpdateGroup: (chatRoomId: string, name: string) => void;
  onLeaveGroup: (chatRoomId: string) => void;
  onDeleteGroup: (chatRoomId: string) => void;
}

export interface NotificationManagerProps {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
  onClearAll: () => void;
}

export interface NotificationBadgeProps {
  count: number;
  priority?: 'normal' | 'high';
  onClick?: () => void;
}

export interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: any) => void;
  lastMessage: any;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  reconnectAttempts: number;
}