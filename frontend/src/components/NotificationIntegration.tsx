// NotificationIntegration component that combines all notification features
import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationManager from './NotificationManager';
import NotificationSettings from './NotificationSettings';
import './NotificationIntegration.css';

interface NotificationIntegrationProps {
  onNotificationClick?: (notification: any) => void;
}

const NotificationIntegration: React.FC<NotificationIntegrationProps> = ({
  onNotificationClick
}) => {
  const {
    notifications,
    settings,
    markAsRead,
    clearAll,
    updateSettings,
    showSettings,
    setShowSettings
  } = useNotifications();

  return (
    <div className="notification-integration">
      {/* Main notification manager */}
      <NotificationManager
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onClearAll={clearAll}
        onNotificationClick={onNotificationClick}
      />

      {/* Settings modal */}
      {showSettings && (
        <div className="notification-settings-overlay">
          <div className="notification-settings-modal">
            <NotificationSettings
              settings={settings}
              onSettingsChange={updateSettings}
              onClose={() => setShowSettings(false)}
            />
          </div>
        </div>
      )}

      {/* Settings trigger button (can be placed anywhere) */}
      <button
        className="notification-settings-trigger"
        onClick={() => setShowSettings(true)}
        aria-label="Open notification settings"
        title="Notification Settings"
      >
        ⚙️
      </button>
    </div>
  );
};

export default NotificationIntegration;