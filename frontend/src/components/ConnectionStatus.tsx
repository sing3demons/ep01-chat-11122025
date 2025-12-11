// Connection status indicator component
import React from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import './ConnectionStatus.css';

interface ConnectionStatusProps {
  showDetails?: boolean;
  showOfflineQueue?: boolean;
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  showDetails = false,
  showOfflineQueue = false,
  className = '' 
}) => {
  const { 
    connectionStatus, 
    reconnectAttempts, 
    isConnected, 
    offlineQueueStats,
    clearFailedMessages 
  } = useWebSocket();

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return `Reconnecting... (${reconnectAttempts}/5)`;
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return '🟢';
      case 'connecting':
      case 'reconnecting':
        return '🟡';
      case 'disconnected':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const hasQueuedMessages = offlineQueueStats.total > 0;
  const hasFailedMessages = offlineQueueStats.failed > 0;

  if (!showDetails && isConnected && !hasQueuedMessages) {
    // Only show when there are connection issues or queued messages
    return null;
  }

  return (
    <div className={`connection-status ${connectionStatus} ${className}`}>
      <div className="status-indicator">
        <span className="status-icon" role="img" aria-label={connectionStatus}>
          {getStatusIcon()}
        </span>
        {showDetails && (
          <span className="status-text">{getStatusText()}</span>
        )}
      </div>
      
      {!isConnected && connectionStatus !== 'connecting' && (
        <div className="connection-warning">
          <small>Messages may not be delivered until connection is restored</small>
        </div>
      )}

      {showOfflineQueue && hasQueuedMessages && (
        <div className="offline-queue-info">
          <div className="queue-stats">
            {offlineQueueStats.queued > 0 && (
              <span className="queue-stat queued">
                📤 {offlineQueueStats.queued} queued
              </span>
            )}
            {offlineQueueStats.sending > 0 && (
              <span className="queue-stat sending">
                ⏳ {offlineQueueStats.sending} sending
              </span>
            )}
            {offlineQueueStats.failed > 0 && (
              <span className="queue-stat failed">
                ❌ {offlineQueueStats.failed} failed
              </span>
            )}
          </div>
          
          {hasFailedMessages && (
            <button 
              className="clear-failed-btn"
              onClick={clearFailedMessages}
              title="Clear failed messages"
            >
              Clear Failed
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;