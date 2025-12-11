// Connection status indicator component
import React from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import './ConnectionStatus.css';

interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const { connectionStatus, reconnectAttempts, isConnected } = useWebSocket();

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

  if (!showDetails && isConnected) {
    // Only show when there are connection issues
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
    </div>
  );
};

export default ConnectionStatus;