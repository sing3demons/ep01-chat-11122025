// NotificationContext for managing notification state and settings
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { Notification, NotificationSettings } from '../types/index';
import { notificationService } from '../services/notification.service';
import { useWebSocket } from './WebSocketContext';

interface NotificationContextType {
  // Notification state
  notifications: Notification[];
  unreadCount: number;
  settings: NotificationSettings | null;
  
  // Actions
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  updateSettings: (settings: NotificationSettings) => void;
  
  // Settings management
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
  userId?: string;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  userId
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { onNotification } = useWebSocket();

  // Initialize default settings
  useEffect(() => {
    if (userId && !settings) {
      const defaultSettings: NotificationSettings = {
        userId,
        soundEnabled: true,
        desktopNotifications: true,
        mentionNotifications: true,
        groupNotifications: true
      };
      setSettings(defaultSettings);
      notificationService.setSettings(defaultSettings);
    }
  }, [userId, settings]);

  // Handle incoming notifications from WebSocket
  useEffect(() => {
    const handleNewNotification = async (notification: Notification) => {
      // Add to notifications list
      setNotifications(prev => {
        // Avoid duplicates
        if (prev.some(n => n.id === notification.id)) {
          return prev;
        }
        return [notification, ...prev];
      });

      // Handle browser notification and sound
      if (settings) {
        await notificationService.handleNotification(notification);
      }
    };

    onNotification(handleNewNotification);
  }, [onNotification, settings]);

  // Handle browser notification clicks
  useEffect(() => {
    const handleNotificationClick = (event: CustomEvent) => {
      const notification = event.detail as Notification;
      markAsRead(notification.id);
      
      // Focus the app window
      window.focus();
      
      // You could also navigate to the relevant chat here
      // For example: navigate(`/chat/${notification.chatRoomId}`);
    };

    window.addEventListener('notificationClick', handleNotificationClick as EventListener);
    
    return () => {
      window.removeEventListener('notificationClick', handleNotificationClick as EventListener);
    };
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    markAllAsRead();
    // Optionally remove them after a delay
    setTimeout(() => {
      setNotifications([]);
    }, 1000);
  }, [markAllAsRead]);

  // Update notification settings
  const updateSettings = useCallback((newSettings: NotificationSettings) => {
    setSettings(newSettings);
    notificationService.setSettings(newSettings);
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
    } catch (error) {
      console.warn('Failed to save notification settings:', error);
    }
  }, []);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (userId) {
      try {
        const savedSettings = localStorage.getItem('notificationSettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          if (parsedSettings.userId === userId) {
            setSettings(parsedSettings);
            notificationService.setSettings(parsedSettings);
          }
        }
      } catch (error) {
        console.warn('Failed to load notification settings:', error);
      }
    }
  }, [userId]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    settings,
    markAsRead,
    markAllAsRead,
    clearAll,
    updateSettings,
    showSettings,
    setShowSettings
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use notification context
export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;