// NotificationSettings component for managing notification preferences
import React, { useState, useEffect } from 'react';
import { NotificationSettings as NotificationSettingsType } from '../types/index';
import { notificationService } from '../services/notification.service';
import './NotificationSettings.css';

interface NotificationSettingsProps {
  settings: NotificationSettingsType | null;
  onSettingsChange: (settings: NotificationSettingsType) => void;
  onClose?: () => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  settings,
  onSettingsChange,
  onClose
}) => {
  const [localSettings, setLocalSettings] = useState<NotificationSettingsType>({
    userId: '',
    soundEnabled: true,
    desktopNotifications: true,
    mentionNotifications: true,
    groupNotifications: true,
    ...settings
  });

  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');
  const [isTestingSound, setIsTestingSound] = useState(false);
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  // Check browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  // Update local settings when props change
  useEffect(() => {
    if (settings) {
      setLocalSettings(prev => ({ ...prev, ...settings }));
    }
  }, [settings]);

  // Handle setting change
  const handleSettingChange = (key: keyof NotificationSettingsType, value: boolean) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
    
    // Update notification service settings
    notificationService.setSettings(newSettings);
  };

  // Request browser notification permission
  const handleRequestPermission = async () => {
    const permission = await notificationService.requestNotificationPermission();
    setBrowserPermission(permission);
    
    if (permission === 'granted') {
      handleSettingChange('desktopNotifications', true);
    }
  };

  // Test notification sound
  const handleTestSound = async () => {
    if (isTestingSound) return;
    
    setIsTestingSound(true);
    try {
      await notificationService.playNotificationSound('message', 'normal');
    } catch (error) {
      console.error('Error testing sound:', error);
    } finally {
      setTimeout(() => setIsTestingSound(false), 1000);
    }
  };

  // Test browser notification
  const handleTestNotification = async () => {
    if (isTestingNotification) return;
    
    setIsTestingNotification(true);
    try {
      await notificationService.testNotification();
    } catch (error) {
      console.error('Error testing notification:', error);
    } finally {
      setTimeout(() => setIsTestingNotification(false), 2000);
    }
  };

  // Get permission status display
  const getPermissionStatus = () => {
    switch (browserPermission) {
      case 'granted':
        return { text: 'Allowed', className: 'granted' };
      case 'denied':
        return { text: 'Blocked', className: 'denied' };
      default:
        return { text: 'Not requested', className: 'default' };
    }
  };

  const permissionStatus = getPermissionStatus();

  return (
    <div className="notification-settings">
      <div className="settings-header">
        <h3>Notification Settings</h3>
        {onClose && (
          <button onClick={onClose} className="close-btn" aria-label="Close settings">
            ×
          </button>
        )}
      </div>

      <div className="settings-content">
        {/* Browser Notifications */}
        <div className="setting-section">
          <div className="setting-header">
            <h4>Browser Notifications</h4>
            <div className={`permission-status ${permissionStatus.className}`}>
              {permissionStatus.text}
            </div>
          </div>
          
          {browserPermission !== 'granted' && (
            <div className="permission-request">
              <p>Enable browser notifications to receive alerts when the app is not active.</p>
              <button 
                onClick={handleRequestPermission}
                className="permission-btn"
                disabled={browserPermission === 'denied'}
              >
                {browserPermission === 'denied' ? 'Blocked by Browser' : 'Enable Notifications'}
              </button>
            </div>
          )}

          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={localSettings.desktopNotifications}
                onChange={(e) => handleSettingChange('desktopNotifications', e.target.checked)}
                disabled={browserPermission !== 'granted'}
              />
              <span className="checkmark"></span>
              <div className="setting-info">
                <div className="setting-name">Desktop Notifications</div>
                <div className="setting-description">
                  Show notifications in your browser when you receive new messages
                </div>
              </div>
            </label>
            {localSettings.desktopNotifications && browserPermission === 'granted' && (
              <button 
                onClick={handleTestNotification}
                className="test-btn"
                disabled={isTestingNotification}
              >
                {isTestingNotification ? 'Testing...' : 'Test'}
              </button>
            )}
          </div>
        </div>

        {/* Sound Settings */}
        <div className="setting-section">
          <h4>Sound Notifications</h4>
          
          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={localSettings.soundEnabled}
                onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
              />
              <span className="checkmark"></span>
              <div className="setting-info">
                <div className="setting-name">Notification Sounds</div>
                <div className="setting-description">
                  Play sound alerts for new notifications
                </div>
              </div>
            </label>
            {localSettings.soundEnabled && (
              <button 
                onClick={handleTestSound}
                className="test-btn"
                disabled={isTestingSound}
              >
                {isTestingSound ? 'Playing...' : 'Test'}
              </button>
            )}
          </div>
        </div>

        {/* Notification Types */}
        <div className="setting-section">
          <h4>Notification Types</h4>
          
          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={localSettings.mentionNotifications}
                onChange={(e) => handleSettingChange('mentionNotifications', e.target.checked)}
              />
              <span className="checkmark"></span>
              <div className="setting-info">
                <div className="setting-name">Mentions</div>
                <div className="setting-description">
                  Get notified when someone mentions you in a group chat
                </div>
              </div>
            </label>
          </div>

          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={localSettings.groupNotifications}
                onChange={(e) => handleSettingChange('groupNotifications', e.target.checked)}
              />
              <span className="checkmark"></span>
              <div className="setting-info">
                <div className="setting-name">Group Activities</div>
                <div className="setting-description">
                  Get notified about group member changes and activities
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Help Text */}
        <div className="settings-help">
          <h4>Need Help?</h4>
          <ul>
            <li>If notifications aren't working, check your browser settings</li>
            <li>You can change these settings at any time</li>
            <li>High priority notifications may override some settings</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;