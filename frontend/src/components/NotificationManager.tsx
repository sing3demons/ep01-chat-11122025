// NotificationManager component for displaying real-time notifications
import React, { useState, useEffect, useCallback } from 'react';
import type { Notification } from '../types/index';
import './NotificationManager.css';

interface NotificationManagerProps {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
  onClearAll: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

interface DisplayNotification extends Notification {
  isVisible: boolean;
  timeoutId?: NodeJS.Timeout;
}

const NotificationManager: React.FC<NotificationManagerProps> = ({
  notifications,
  onMarkAsRead,
  onClearAll,
  onNotificationClick
}) => {
  const [displayNotifications, setDisplayNotifications] = useState<DisplayNotification[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle new notifications
  useEffect(() => {
    const newNotifications = notifications.filter(
      notification => !displayNotifications.some(dn => dn.id === notification.id)
    );

    if (newNotifications.length > 0) {
      setDisplayNotifications(prev => [
        ...prev,
        ...newNotifications.map(notification => ({
          ...notification,
          isVisible: true
        }))
      ]);

      // Auto-hide notifications after 5 seconds (except high priority)
      newNotifications.forEach(notification => {
        if (notification.priority !== 'high') {
          const timeoutId = setTimeout(() => {
            hideNotification(notification.id);
          }, 5000);

          setDisplayNotifications(prev =>
            prev.map(dn =>
              dn.id === notification.id ? { ...dn, timeoutId } : dn
            )
          );
        }
      });
    }
  }, [notifications]);

  // Hide notification
  const hideNotification = useCallback((notificationId: string) => {
    setDisplayNotifications(prev =>
      prev.map(notification => {
        if (notification.id === notificationId) {
          if (notification.timeoutId) {
            clearTimeout(notification.timeoutId);
          }
          return { ...notification, isVisible: false };
        }
        return notification;
      })
    );

    // Remove from display after animation
    setTimeout(() => {
      setDisplayNotifications(prev =>
        prev.filter(notification => notification.id !== notificationId)
      );
    }, 300);
  }, []);

  // Handle notification click
  const handleNotificationClick = useCallback((notification: Notification) => {
    onMarkAsRead(notification.id);
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    hideNotification(notification.id);
  }, [onMarkAsRead, onNotificationClick, hideNotification]);

  // Handle dismiss notification
  const handleDismiss = useCallback((notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onMarkAsRead(notificationId);
    hideNotification(notificationId);
  }, [onMarkAsRead, hideNotification]);

  // Get notification icon based on type
  const getNotificationIcon = (type: string, priority: string) => {
    if (priority === 'high') {
      return '🔴';
    }
    switch (type) {
      case 'message':
        return '💬';
      case 'mention':
        return '📢';
      case 'group_activity':
        return '👥';
      default:
        return '🔔';
    }
  };

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const visibleNotifications = displayNotifications.filter(n => n.isVisible);

  return (
    <div className="notification-manager">
      {/* Floating notifications */}
      <div className="floating-notifications">
        {visibleNotifications.map(notification => (
          <div
            key={notification.id}
            className={`floating-notification ${notification.priority} ${notification.isVisible ? 'visible' : 'hidden'}`}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="notification-icon">
              {getNotificationIcon(notification.type, notification.priority)}
            </div>
            <div className="notification-content">
              <div className="notification-title">{notification.title}</div>
              <div className="notification-message">{notification.content}</div>
              <div className="notification-time">
                {formatTimeAgo(notification.createdAt)}
              </div>
            </div>
            <button
              className="notification-dismiss"
              onClick={(e) => handleDismiss(notification.id, e)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Notification center toggle */}
      {unreadCount > 0 && (
        <button
          className="notification-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={`${unreadCount} unread notifications`}
        >
          🔔
          <span className="notification-count">{unreadCount}</span>
        </button>
      )}

      {/* Notification center panel */}
      {isExpanded && (
        <div className="notification-panel">
          <div className="notification-header">
            <h3>Notifications</h3>
            <div className="notification-actions">
              {unreadCount > 0 && (
                <button onClick={onClearAll} className="clear-all-btn">
                  Clear All
                </button>
              )}
              <button
                onClick={() => setIsExpanded(false)}
                className="close-btn"
                aria-label="Close notifications"
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">No notifications</div>
            ) : (
              notifications
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map(notification => (
                  <div
                    key={notification.id}
                    className={`notification-item ${notification.isRead ? 'read' : 'unread'} ${notification.priority}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-icon">
                      {getNotificationIcon(notification.type, notification.priority)}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.content}</div>
                      <div className="notification-time">
                        {formatTimeAgo(notification.createdAt)}
                      </div>
                    </div>
                    {!notification.isRead && <div className="unread-indicator"></div>}
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationManager;