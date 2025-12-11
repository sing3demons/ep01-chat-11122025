// Custom hook for managing offline support functionality
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { QueuedMessage } from '../services/offline.service';

export interface OfflineSupportState {
  isOnline: boolean;
  hasQueuedMessages: boolean;
  queuedCount: number;
  failedCount: number;
  sendingCount: number;
  canSendMessages: boolean;
  connectionStatusText: string;
}

export const useOfflineSupport = (chatRoomId?: string) => {
  const {
    isConnected,
    connectionStatus,
    offlineQueueStats,
    queuedMessages,
    clearFailedMessages,
    getQueuedMessagesForChat
  } = useWebSocket();

  const [offlineState, setOfflineState] = useState<OfflineSupportState>({
    isOnline: isConnected,
    hasQueuedMessages: false,
    queuedCount: 0,
    failedCount: 0,
    sendingCount: 0,
    canSendMessages: true,
    connectionStatusText: 'Connected'
  });

  // Update offline state when connection or queue changes
  useEffect(() => {
    const chatQueuedMessages = chatRoomId ? getQueuedMessagesForChat(chatRoomId) : [];
    
    setOfflineState({
      isOnline: isConnected,
      hasQueuedMessages: offlineQueueStats.total > 0,
      queuedCount: offlineQueueStats.queued,
      failedCount: offlineQueueStats.failed,
      sendingCount: offlineQueueStats.sending,
      canSendMessages: true, // Always allow sending (will queue if offline)
      connectionStatusText: getConnectionStatusText()
    });
  }, [isConnected, connectionStatus, offlineQueueStats, chatRoomId, getQueuedMessagesForChat]);

  const getConnectionStatusText = useCallback(() => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'disconnected':
        return 'Offline';
      default:
        return 'Unknown';
    }
  }, [connectionStatus]);

  // Get queued messages for current chat
  const getChatQueuedMessages = useCallback((): QueuedMessage[] => {
    if (!chatRoomId) return [];
    return getQueuedMessagesForChat(chatRoomId);
  }, [chatRoomId, getQueuedMessagesForChat]);

  // Clear failed messages
  const handleClearFailedMessages = useCallback(() => {
    clearFailedMessages();
  }, [clearFailedMessages]);

  // Check if message should show retry indicator
  const shouldShowRetryIndicator = useCallback((messageId: string): boolean => {
    return queuedMessages.some(qm => qm.id === messageId && qm.status !== 'queued');
  }, [queuedMessages]);

  // Get retry indicator data for a message
  const getRetryIndicatorData = useCallback((messageId: string): QueuedMessage | null => {
    return queuedMessages.find(qm => qm.id === messageId) || null;
  }, [queuedMessages]);

  // Get offline message placeholder text
  const getOfflineMessagePlaceholder = useCallback((): string => {
    if (isConnected) return "Type a message...";
    
    switch (connectionStatus) {
      case 'connecting':
        return "Connecting... Messages will be queued";
      case 'reconnecting':
        return "Reconnecting... Messages will be queued";
      default:
        return "Offline - Messages will be queued for sending";
    }
  }, [isConnected, connectionStatus]);

  // Get queue summary text
  const getQueueSummaryText = useCallback((): string | null => {
    if (offlineQueueStats.total === 0) return null;
    
    const parts = [];
    if (offlineQueueStats.queued > 0) parts.push(`${offlineQueueStats.queued} queued`);
    if (offlineQueueStats.sending > 0) parts.push(`${offlineQueueStats.sending} sending`);
    if (offlineQueueStats.failed > 0) parts.push(`${offlineQueueStats.failed} failed`);
    
    return parts.join(', ');
  }, [offlineQueueStats]);

  // Check if should show connection warning
  const shouldShowConnectionWarning = useCallback((): boolean => {
    return !isConnected || offlineQueueStats.failed > 0;
  }, [isConnected, offlineQueueStats.failed]);

  return {
    offlineState,
    getChatQueuedMessages,
    handleClearFailedMessages,
    shouldShowRetryIndicator,
    getRetryIndicatorData,
    getOfflineMessagePlaceholder,
    getQueueSummaryText,
    shouldShowConnectionWarning,
    
    // Direct access to useful values
    isOnline: offlineState.isOnline,
    hasQueuedMessages: offlineState.hasQueuedMessages,
    canSendMessages: offlineState.canSendMessages,
    connectionStatusText: offlineState.connectionStatusText
  };
};