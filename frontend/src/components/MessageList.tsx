import React, { useEffect, useRef } from 'react';
import { MessageListProps } from '../interfaces/components';
import { Message } from '../types/index';
import './MessageList.css';

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  typingIndicators,
  onMessageStatusUpdate
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate marking messages as read when they come into view
  useEffect(() => {
    const unreadMessages = messages.filter(
      msg => msg.senderId !== currentUserId && msg.status !== 'read'
    );

    unreadMessages.forEach(msg => {
      setTimeout(() => {
        onMessageStatusUpdate(msg.id, 'read');
      }, 500);
    });
  }, [messages, currentUserId, onMessageStatusUpdate]);

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getMessageStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      default:
        return '';
    }
  };

  const renderTypingIndicators = () => {
    const activeTyping = typingIndicators.filter(
      indicator => indicator.isTyping && indicator.userId !== currentUserId
    );

    if (activeTyping.length === 0) return null;

    return (
      <div className="typing-indicator">
        <div className="typing-bubble">
          <div className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
        <span className="typing-text">
          {activeTyping.length === 1 ? 'Someone is typing...' : 'Multiple people are typing...'}
        </span>
      </div>
    );
  };

  return (
    <div className="message-list">
      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${
              message.senderId === currentUserId ? 'message-sent' : 'message-received'
            }`}
          >
            <div className="message-bubble">
              <div className="message-content">{message.content}</div>
              <div className="message-meta">
                <span className="message-time">{formatTime(message.timestamp)}</span>
                {message.senderId === currentUserId && (
                  <span className={`message-status ${message.status}`}>
                    {getMessageStatusIcon(message.status)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {renderTypingIndicators()}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;