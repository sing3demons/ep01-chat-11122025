# Notification System Usage Guide

This guide explains how to use the notification UI components in the WhatsApp chat system.

## Components Overview

### 1. NotificationManager
The main component that handles displaying floating notifications and the notification center.

**Features:**
- Floating notifications that appear in the top-right corner
- Notification center panel with all notifications
- Auto-hide for normal priority notifications (5 seconds)
- High priority notifications stay visible until dismissed
- Click to navigate to relevant chat room
- Mark as read functionality

### 2. NotificationBadge
A small badge component that shows unread counts.

**Features:**
- Shows count of unread items
- Different sizes (small, medium, large)
- Different priorities (normal, high with pulse animation)
- Positioning options (top-right, top-left, bottom-right, bottom-left)
- Clickable with event handling

### 3. NotificationSettings
A settings panel for managing notification preferences.

**Features:**
- Browser notification permission management
- Sound notification toggle
- Notification type filtering (mentions, group activities)
- Test buttons for notifications and sounds
- Persistent settings storage

### 4. NotificationIntegration
A wrapper component that combines all notification features.

**Features:**
- Integrates NotificationManager and NotificationSettings
- Provides settings modal overlay
- Settings trigger button

## Setup and Usage

### 1. Provider Setup

First, wrap your app with the notification providers:

```tsx
import { NotificationProvider } from './contexts/NotificationContext';
import { WebSocketProvider } from './contexts/WebSocketContext';

function App() {
  return (
    <WebSocketProvider>
      <NotificationProvider userId="current-user-id">
        <YourAppComponents />
      </NotificationProvider>
    </WebSocketProvider>
  );
}
```

### 2. Basic Integration

Add the notification integration to your main component:

```tsx
import { NotificationIntegration } from './components';

function ChatInterface() {
  return (
    <div className="chat-interface">
      {/* Your existing components */}
      
      <NotificationIntegration
        onNotificationClick={(notification) => {
          // Navigate to the relevant chat room
          navigateToChat(notification.chatRoomId);
        }}
      />
    </div>
  );
}
```

### 3. Using NotificationBadge

Add badges to show unread counts:

```tsx
import { NotificationBadge, useNotifications } from './components';

function UserAvatar() {
  const { unreadCount } = useNotifications();
  
  return (
    <div className="user-avatar" style={{ position: 'relative' }}>
      <img src="avatar.jpg" alt="User" />
      {unreadCount > 0 && (
        <NotificationBadge 
          count={unreadCount}
          priority="normal"
          position="top-right"
          size="small"
          onClick={() => openNotificationCenter()}
        />
      )}
    </div>
  );
}
```

### 4. Custom Notification Handling

Use the notification context for custom handling:

```tsx
import { useNotifications } from './contexts/NotificationContext';

function CustomComponent() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    settings,
    updateSettings
  } = useNotifications();

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    // Custom navigation logic
  };

  return (
    <div>
      <p>You have {unreadCount} unread notifications</p>
      {notifications.map(notification => (
        <div key={notification.id} onClick={() => handleNotificationClick(notification)}>
          {notification.title}: {notification.content}
        </div>
      ))}
    </div>
  );
}
```

## Notification Types

The system supports three types of notifications:

1. **message** - New chat messages
2. **mention** - When user is mentioned in a group
3. **group_activity** - Group member changes, etc.

## Priority Levels

- **normal** - Auto-hides after 5 seconds, blue badge
- **high** - Stays visible until dismissed, red badge with pulse animation

## Browser Notification Integration

The system automatically requests browser notification permission and shows native notifications when:
- Desktop notifications are enabled in settings
- User is not actively viewing the relevant chat
- Browser tab is not focused

## Sound Notifications

The system generates different tones for different notification types:
- Message: 800Hz tone
- Mention: 1000Hz tone  
- Group activity: 600Hz tone
- High priority: 20% higher frequency

## Settings Persistence

Notification settings are automatically saved to localStorage and restored when the user returns.

## Accessibility

All components include proper ARIA labels and keyboard navigation support:
- Notification badges are properly labeled
- Settings have descriptive text
- Keyboard navigation works throughout

## Customization

### Styling
All components use CSS classes that can be customized:
- `.notification-manager` - Main container
- `.floating-notification` - Individual floating notifications
- `.notification-badge` - Badge styling
- `.notification-settings` - Settings panel

### Sounds
The notification service generates tones programmatically, but you can extend it to use custom sound files by modifying the `loadSound` method in `notification.service.ts`.

## Testing

The components include comprehensive tests covering:
- Rendering with different props
- User interactions
- Auto-hide behavior
- Accessibility features

Run tests with:
```bash
npm test -- --testPathPattern="Notification"
```

## Troubleshooting

### Notifications not showing
1. Check browser notification permissions
2. Verify WebSocket connection is active
3. Check notification settings are enabled

### Sounds not playing
1. Check if sound is enabled in settings
2. Verify browser allows audio playback
3. Check if user has interacted with the page (required by browsers)

### Settings not persisting
1. Check localStorage is available
2. Verify user ID is set correctly
3. Check for localStorage quota limits