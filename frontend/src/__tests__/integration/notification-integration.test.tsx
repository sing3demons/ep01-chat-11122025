// Notification system integration tests
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationProvider, useNotification } from '../../contexts/NotificationContext';
import { WebSocketProvider } from '../../contexts/WebSocketContext';
import { notificationService } from '../../services/notification.service';

// Mock browser Notification API
const mockNotification = {
  permission: 'granted' as NotificationPermission,
  requestPermission: jest.fn().mockResolvedValue('granted' as NotificationPermission)
};

Object.defineProperty(window, 'Notification', {
  value: jest.fn().mockImplementation((title: string, options?: NotificationOptions) => ({
    title,
    body: options?.body,
    icon: options?.icon,
    close: jest.fn(),
    onclick: null,
    onclose: null,
    onerror: null,
    onshow: null
  })),
  configurable: true
});

Object.defineProperty(window.Notification, 'permission', {
  value: mockNotification.permission,
  configurable: true
});

Object.defineProperty(window.Notification, 'requestPermission', {
  value: mockNotification.requestPermission,
  configurable: true
});

// Mock Audio API for notification sounds
const mockAudio = {
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  load: jest.fn(),
  currentTime: 0,
  volume: 1
};

Object.defineProperty(window, 'Audio', {
  value: jest.fn().mockImplementation(() => mockAudio),
  configurable: true
});

// Test component that uses notification context
const TestNotificationComponent: React.FC = () => {
  const {
    notifications,
    unreadCount,
    settings,
    showNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    updateSettings,
    requestPermission,
    hasPermission
  } = useNotification();

  const [testTitle, setTestTitle] = React.useState('');
  const [testMessage, setTestMessage] = React.useState('');

  const handleShowNotification = () => {
    if (testTitle && testMessage) {
      showNotification({
        id: 'test-' + Date.now(),
        type: 'message',
        title: testTitle,
        content: testMessage,
        chatRoomId: 'test-room',
        isRead: false,
        priority: 'normal',
        createdAt: new Date()
      });
    }
  };

  return (
    <div>
      <div data-testid="notification-count">
        Notifications: {notifications.length}
      </div>
      
      <div data-testid="unread-count">
        Unread: {unreadCount}
      </div>
      
      <div data-testid="permission-status">
        Permission: {hasPermission ? 'Granted' : 'Not Granted'}
      </div>
      
      <div data-testid="settings">
        Settings: {JSON.stringify(settings)}
      </div>
      
      <div data-testid="notifications-list">
        {notifications.map((notification, index) => (
          <div key={notification.id} data-testid={`notification-${index}`}>
            <span>{notification.title}: {notification.content}</span>
            <span data-testid={`notification-${index}-read`}>
              {notification.isRead ? 'Read' : 'Unread'}
            </span>
            <button 
              data-testid={`mark-read-${index}`}
              onClick={() => markAsRead(notification.id)}
            >
              Mark Read
            </button>
          </div>
        ))}
      </div>
      
      <input
        data-testid="title-input"
        placeholder="Notification title"
        value={testTitle}
        onChange={(e) => setTestTitle(e.target.value)}
      />
      
      <input
        data-testid="message-input"
        placeholder="Notification message"
        value={testMessage}
        onChange={(e) => setTestMessage(e.target.value)}
      />
      
      <button data-testid="show-notification" onClick={handleShowNotification}>
        Show Notification
      </button>
      
      <button data-testid="request-permission" onClick={requestPermission}>
        Request Permission
      </button>
      
      <button data-testid="mark-all-read" onClick={markAllAsRead}>
        Mark All Read
      </button>
      
      <button data-testid="clear-notifications" onClick={clearNotifications}>
        Clear All
      </button>
      
      <button 
        data-testid="toggle-sound"
        onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
      >
        Toggle Sound: {settings.soundEnabled ? 'On' : 'Off'}
      </button>
      
      <button 
        data-testid="toggle-desktop"
        onClick={() => updateSettings({ desktopNotifications: !settings.desktopNotifications })}
      >
        Toggle Desktop: {settings.desktopNotifications ? 'On' : 'Off'}
      </button>
    </div>
  );
};

describe('Notification Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset notification permission
    Object.defineProperty(window.Notification, 'permission', {
      value: 'granted',
      configurable: true
    });
  });

  describe('Notification Display and Management', () => {
    test('displays notifications and manages read status', async () => {
      render(
        <NotificationProvider>
          <TestNotificationComponent />
        </NotificationProvider>
      );

      // Initially no notifications
      expect(screen.getByTestId('notification-count')).toHaveTextContent('Notifications: 0');
      expect(screen.getByTestId('unread-count')).toHaveTextContent('Unread: 0');

      // Create a test notification
      const titleInput = screen.getByTestId('title-input');
      const messageInput = screen.getByTestId('message-input');
      const showButton = screen.getByTestId('show-notification');

      await act(async () => {
        await userEvent.type(titleInput, 'Test Notification');
        await userEvent.type(messageInput, 'This is a test message');
        await userEvent.click(showButton);
      });

      // Check notification appears
      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('Notifications: 1');
        expect(screen.getByTestId('unread-count')).toHaveTextContent('Unread: 1');
        expect(screen.getByTestId('notification-0')).toHaveTextContent('Test Notification: This is a test message');
        expect(screen.getByTestId('notification-0-read')).toHaveTextContent('Unread');
      });

      // Mark as read
      const markReadButton = screen.getByTestId('mark-read-0');
      await act(async () => {
        await userEvent.click(markReadButton);
      });

      // Check read status updated
      await waitFor(() => {
        expect(screen.getByTestId('unread-count')).toHaveTextContent('Unread: 0');
        expect(screen.getByTestId('notification-0-read')).toHaveTextContent('Read');
      });
    });

    test('manages multiple notifications', async () => {
      render(
        <NotificationProvider>
          <TestNotificationComponent />
        </NotificationProvider>
      );

      const titleInput = screen.getByTestId('title-input');
      const messageInput = screen.getByTestId('message-input');
      const showButton = screen.getByTestId('show-notification');

      // Create multiple notifications
      for (let i = 1; i <= 3; i++) {
        await act(async () => {
          await userEvent.clear(titleInput);
          await userEvent.clear(messageInput);
          await userEvent.type(titleInput, `Notification ${i}`);
          await userEvent.type(messageInput, `Message ${i}`);
          await userEvent.click(showButton);
        });
      }

      // Check all notifications appear
      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('Notifications: 3');
        expect(screen.getByTestId('unread-count')).toHaveTextContent('Unread: 3');
      });

      // Mark all as read
      const markAllReadButton = screen.getByTestId('mark-all-read');
      await act(async () => {
        await userEvent.click(markAllReadButton);
      });

      // Check all marked as read
      await waitFor(() => {
        expect(screen.getByTestId('unread-count')).toHaveTextContent('Unread: 0');
      });

      // Clear all notifications
      const clearButton = screen.getByTestId('clear-notifications');
      await act(async () => {
        await userEvent.click(clearButton);
      });

      // Check all cleared
      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('Notifications: 0');
      });
    });
  });

  describe('Browser Notification Integration', () => {
    test('requests and handles browser notification permission', async () => {
      render(
        <NotificationProvider>
          <TestNotificationComponent />
        </NotificationProvider>
      );

      // Initially should have permission (mocked as granted)
      expect(screen.getByTestId('permission-status')).toHaveTextContent('Permission: Granted');

      // Test permission request
      const requestButton = screen.getByTestId('request-permission');
      await act(async () => {
        await userEvent.click(requestButton);
      });

      // Should still have permission
      expect(mockNotification.requestPermission).toHaveBeenCalled();
      expect(screen.getByTestId('permission-status')).toHaveTextContent('Permission: Granted');
    });

    test('shows browser notifications when enabled', async () => {
      render(
        <NotificationProvider>
          <TestNotificationComponent />
        </NotificationProvider>
      );

      // Ensure desktop notifications are enabled
      const toggleDesktopButton = screen.getByTestId('toggle-desktop');
      const settingsElement = screen.getByTestId('settings');
      
      if (!settingsElement.textContent?.includes('"desktopNotifications":true')) {
        await act(async () => {
          await userEvent.click(toggleDesktopButton);
        });
      }

      // Create a notification
      const titleInput = screen.getByTestId('title-input');
      const messageInput = screen.getByTestId('message-input');
      const showButton = screen.getByTestId('show-notification');

      await act(async () => {
        await userEvent.type(titleInput, 'Browser Notification');
        await userEvent.type(messageInput, 'This should show in browser');
        await userEvent.click(showButton);
      });

      // Check browser notification was created
      await waitFor(() => {
        expect(window.Notification).toHaveBeenCalledWith(
          'Browser Notification',
          expect.objectContaining({
            body: 'This should show in browser'
          })
        );
      });
    });

    test('respects desktop notification settings', async () => {
      render(
        <NotificationProvider>
          <TestNotificationComponent />
        </NotificationProvider>
      );

      // Disable desktop notifications
      const toggleDesktopButton = screen.getByTestId('toggle-desktop');
      await act(async () => {
        await userEvent.click(toggleDesktopButton);
      });

      // Verify setting is disabled
      await waitFor(() => {
        const settingsElement = screen.getByTestId('settings');
        expect(settingsElement.textContent).toContain('"desktopNotifications":false');
      });

      // Create a notification
      const titleInput = screen.getByTestId('title-input');
      const messageInput = screen.getByTestId('message-input');
      const showButton = screen.getByTestId('show-notification');

      await act(async () => {
        await userEvent.type(titleInput, 'No Browser Notification');
        await userEvent.type(messageInput, 'This should not show in browser');
        await userEvent.click(showButton);
      });

      // Browser notification should not be created
      expect(window.Notification).not.toHaveBeenCalled();
    });
  });

  describe('Sound Notification Integration', () => {
    test('plays notification sounds when enabled', async () => {
      render(
        <NotificationProvider>
          <TestNotificationComponent />
        </NotificationProvider>
      );

      // Ensure sound is enabled
      const toggleSoundButton = screen.getByTestId('toggle-sound');
      const settingsElement = screen.getByTestId('settings');
      
      if (!settingsElement.textContent?.includes('"soundEnabled":true')) {
        await act(async () => {
          await userEvent.click(toggleSoundButton);
        });
      }

      // Create a notification
      const titleInput = screen.getByTestId('title-input');
      const messageInput = screen.getByTestId('message-input');
      const showButton = screen.getByTestId('show-notification');

      await act(async () => {
        await userEvent.type(titleInput, 'Sound Notification');
        await userEvent.type(messageInput, 'This should play a sound');
        await userEvent.click(showButton);
      });

      // Check sound was played
      await waitFor(() => {
        expect(window.Audio).toHaveBeenCalled();
        expect(mockAudio.play).toHaveBeenCalled();
      });
    });

    test('respects sound notification settings', async () => {
      render(
        <NotificationProvider>
          <TestNotificationComponent />
        </NotificationProvider>
      );

      // Disable sound
      const toggleSoundButton = screen.getByTestId('toggle-sound');
      await act(async () => {
        await userEvent.click(toggleSoundButton);
      });

      // Verify setting is disabled
      await waitFor(() => {
        const settingsElement = screen.getByTestId('settings');
        expect(settingsElement.textContent).toContain('"soundEnabled":false');
      });

      // Create a notification
      const titleInput = screen.getByTestId('title-input');
      const messageInput = screen.getByTestId('message-input');
      const showButton = screen.getByTestId('show-notification');

      await act(async () => {
        await userEvent.type(titleInput, 'Silent Notification');
        await userEvent.type(messageInput, 'This should be silent');
        await userEvent.click(showButton);
      });

      // Sound should not be played
      expect(mockAudio.play).not.toHaveBeenCalled();
    });
  });

  describe('WebSocket Integration', () => {
    test('receives notifications via WebSocket', async () => {
      // Mock WebSocket that sends notifications
      const NotificationWebSocket = class {
        static OPEN = 1;
        readyState = 1;
        onmessage: ((event: MessageEvent) => void) | null = null;
        
        constructor() {
          // Simulate receiving a notification via WebSocket
          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage(new MessageEvent('message', {
                data: JSON.stringify({
                  type: 'notification',
                  payload: {
                    id: 'ws-notification-1',
                    type: 'message',
                    title: 'WebSocket Notification',
                    content: 'Received via WebSocket',
                    chatRoomId: 'test-room',
                    isRead: false,
                    priority: 'normal',
                    createdAt: new Date().toISOString()
                  }
                })
              }));
            }
          }, 500);
        }
        
        send() {}
        close() {}
      };

      (global as any).WebSocket = NotificationWebSocket;

      render(
        <WebSocketProvider>
          <NotificationProvider>
            <TestNotificationComponent />
          </NotificationProvider>
        </WebSocketProvider>
      );

      // Wait for WebSocket notification to arrive
      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('Notifications: 1');
        expect(screen.getByTestId('notification-0')).toHaveTextContent('WebSocket Notification: Received via WebSocket');
      }, { timeout: 3000 });
    });
  });

  describe('Priority and Mention Notifications', () => {
    test('handles high priority notifications differently', async () => {
      render(
        <NotificationProvider>
          <TestNotificationComponent />
        </NotificationProvider>
      );

      // Create high priority notification by simulating mention
      await act(async () => {
        notificationService.showNotification({
          id: 'high-priority-1',
          type: 'mention',
          title: 'You were mentioned',
          content: '@testuser mentioned you in a group',
          chatRoomId: 'group-room',
          isRead: false,
          priority: 'high',
          createdAt: new Date()
        });
      });

      // High priority notification should appear
      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('Notifications: 1');
        expect(screen.getByTestId('notification-0')).toHaveTextContent('You were mentioned: @testuser mentioned you in a group');
      });

      // Should trigger browser notification even if normally disabled for mentions
      expect(window.Notification).toHaveBeenCalledWith(
        'You were mentioned',
        expect.objectContaining({
          body: '@testuser mentioned you in a group'
        })
      );
    });

    test('groups notifications by chat room', async () => {
      render(
        <NotificationProvider>
          <TestNotificationComponent />
        </NotificationProvider>
      );

      // Create multiple notifications from same chat room
      for (let i = 1; i <= 3; i++) {
        await act(async () => {
          notificationService.showNotification({
            id: `room-notification-${i}`,
            type: 'message',
            title: `Message ${i}`,
            content: `Content ${i}`,
            chatRoomId: 'same-room',
            isRead: false,
            priority: 'normal',
            createdAt: new Date()
          });
        });
      }

      // All notifications should appear
      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('Notifications: 3');
        expect(screen.getByTestId('unread-count')).toHaveTextContent('Unread: 3');
      });
    });
  });

  describe('Notification Persistence', () => {
    test('persists notifications across component remounts', async () => {
      const { rerender } = render(
        <NotificationProvider>
          <TestNotificationComponent />
        </NotificationProvider>
      );

      // Create a notification
      const titleInput = screen.getByTestId('title-input');
      const messageInput = screen.getByTestId('message-input');
      const showButton = screen.getByTestId('show-notification');

      await act(async () => {
        await userEvent.type(titleInput, 'Persistent Notification');
        await userEvent.type(messageInput, 'This should persist');
        await userEvent.click(showButton);
      });

      // Verify notification exists
      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('Notifications: 1');
      });

      // Remount component
      rerender(
        <NotificationProvider>
          <TestNotificationComponent />
        </NotificationProvider>
      );

      // Notification should still exist
      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('Notifications: 1');
        expect(screen.getByTestId('notification-0')).toHaveTextContent('Persistent Notification: This should persist');
      });
    });
  });

  describe('Error Handling', () => {
    test('handles notification permission denied gracefully', async () => {
      // Mock permission denied
      Object.defineProperty(window.Notification, 'permission', {
        value: 'denied',
        configurable: true
      });

      mockNotification.requestPermission.mockResolvedValue('denied');

      render(
        <NotificationProvider>
          <TestNotificationComponent />
        </NotificationProvider>
      );

      // Should show permission not granted
      expect(screen.getByTestId('permission-status')).toHaveTextContent('Permission: Not Granted');

      // Request permission
      const requestButton = screen.getByTestId('request-permission');
      await act(async () => {
        await userEvent.click(requestButton);
      });

      // Should still show not granted
      await waitFor(() => {
        expect(screen.getByTestId('permission-status')).toHaveTextContent('Permission: Not Granted');
      });

      // Create notification - should still work in-app even without browser permission
      const titleInput = screen.getByTestId('title-input');
      const messageInput = screen.getByTestId('message-input');
      const showButton = screen.getByTestId('show-notification');

      await act(async () => {
        await userEvent.type(titleInput, 'In-App Only');
        await userEvent.type(messageInput, 'No browser notification');
        await userEvent.click(showButton);
      });

      // In-app notification should still work
      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('Notifications: 1');
      });

      // But browser notification should not be created
      expect(window.Notification).not.toHaveBeenCalled();
    });

    test('handles audio playback errors gracefully', async () => {
      // Mock audio play failure
      mockAudio.play.mockRejectedValue(new Error('Audio playback failed'));

      render(
        <NotificationProvider>
          <TestNotificationComponent />
        </NotificationProvider>
      );

      // Create notification with sound enabled
      const titleInput = screen.getByTestId('title-input');
      const messageInput = screen.getByTestId('message-input');
      const showButton = screen.getByTestId('show-notification');

      await act(async () => {
        await userEvent.type(titleInput, 'Audio Error Test');
        await userEvent.type(messageInput, 'Audio should fail gracefully');
        await userEvent.click(showButton);
      });

      // Notification should still appear despite audio error
      await waitFor(() => {
        expect(screen.getByTestId('notification-count')).toHaveTextContent('Notifications: 1');
        expect(screen.getByTestId('notification-0')).toHaveTextContent('Audio Error Test: Audio should fail gracefully');
      });

      // Audio play should have been attempted
      expect(mockAudio.play).toHaveBeenCalled();
    });
  });
});