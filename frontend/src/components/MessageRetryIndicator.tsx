// Message retry indicator component for showing offline message status
import React from 'react';
import { QueuedMessage } from '../services/offline.service';
import './MessageRetryIndicator.css';

interface MessageRetryIndicatorProps {
  queuedMessage: QueuedMessage;
  onRetry?: (messageId: string) => void;
  onCancel?: (messageId: string) => void;
}

const MessageRetryIndicator: React.FC<MessageRetryIndicatorProps> = ({
  queuedMessage,
  onRetry,
  onCancel
}) => {
  const getStatusIcon = () => {
    switch (queuedMessage.status) {
      case 'queued':
        return '📤';
      case 'sending':
        return '⏳';
      case 'failed':
        return '❌';
      default:
        return '📤';
    }
  };

  const getStatusText = () => {
    switch (queuedMessage.status) {
      case 'queued':
        return 'Queued for sending';
      case 'sending':
        return 'Sending...';
      case 'failed':
        return `Failed (${queuedMessage.retryCount}/${3} attempts)`;
      default:
        return 'Unknown status';
    }
  };

  const canRetry = queuedMessage.status === 'failed' && queuedMessage.retryCount < 3;

  return (
    <div className={`message-retry-indicator ${queuedMessage.status}`}>
      <div className="retry-status">
        <span className="status-icon" role="img" aria-label={queuedMessage.status}>
          {getStatusIcon()}
        </span>
        <span className="status-text">{getStatusText()}</span>
      </div>
      
      {queuedMessage.status === 'failed' && (
        <div className="retry-actions">
          {canRetry && onRetry && (
            <button
              className="retry-btn"
              onClick={() => onRetry(queuedMessage.id)}
              title="Retry sending message"
            >
              🔄 Retry
            </button>
          )}
          {onCancel && (
            <button
              className="cancel-btn"
              onClick={() => onCancel(queuedMessage.id)}
              title="Cancel message"
            >
              ✕ Cancel
            </button>
          )}
        </div>
      )}
      
      <div className="message-timestamp">
        {queuedMessage.timestamp.toLocaleTimeString()}
      </div>
    </div>
  );
};

export default MessageRetryIndicator;