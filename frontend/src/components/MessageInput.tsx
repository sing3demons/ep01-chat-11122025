import React, { useState, useRef, useEffect } from 'react';
import { MessageInputProps } from '../interfaces/components';
import { useWebSocket } from '../contexts/WebSocketContext';
import './MessageInput.css';

const MessageInput: React.FC<MessageInputProps> = ({
  chatRoomId,
  currentUserId,
  onSendMessage,
  onTypingStart,
  onTypingStop,
  disabled = false
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { isConnected, connectionStatus, offlineQueueStats } = useWebSocket();

  // Focus input when chat room changes
  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [chatRoomId, disabled]);

  // Handle typing indicators
  useEffect(() => {
    if (message.trim() && !isTyping) {
      setIsTyping(true);
      onTypingStart();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onTypingStop();
      }
    }, 1000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, isTyping, onTypingStart, onTypingStop]);

  // Cleanup typing indicator on unmount
  useEffect(() => {
    return () => {
      if (isTyping) {
        onTypingStop();
      }
    };
  }, [isTyping, onTypingStop]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled) return;

    onSendMessage(trimmedMessage);
    setMessage('');
    
    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      onTypingStop();
    }
  };

  const getPlaceholderText = () => {
    if (disabled) return "Message input disabled";
    if (!isConnected) {
      if (connectionStatus === 'connecting') return "Connecting... Messages will be queued";
      if (connectionStatus === 'reconnecting') return "Reconnecting... Messages will be queued";
      return "Offline - Messages will be queued for sending";
    }
    return "Type a message...";
  };

  const getInputStatus = () => {
    if (!isConnected && offlineQueueStats.total > 0) {
      return `${offlineQueueStats.queued} queued, ${offlineQueueStats.failed} failed`;
    }
    return null;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  return (
    <div className="message-input">
      <form onSubmit={handleSubmit} className="message-form">
        <div className="input-container">
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            placeholder={getPlaceholderText()}
            disabled={disabled}
            className={`message-textarea ${!isConnected ? 'offline' : ''}`}
            rows={1}
            maxLength={1000}
          />
          
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="send-button"
            aria-label="Send message"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
        
        <div className="input-footer">
          <div className="footer-left">
            {getInputStatus() && (
              <span className="queue-status">
                {getInputStatus()}
              </span>
            )}
          </div>
          <span className="character-count">
            {message.length}/1000
          </span>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;