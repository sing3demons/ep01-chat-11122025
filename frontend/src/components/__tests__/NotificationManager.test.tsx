// NotificationManager component tests
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationManager from '../NotificationManager';
import type { Notification } from '../../types/index';

// Mock notifications data
const mockNotifications: Notification[] = [
  {
    id: '1',
    userId: 'user1',
    type: 'message',
    title: 'New Message',
    content: 'Hello there!',
    chatRoomId: 'room1',
    isRead: false,
    priority: 'normal',
    createdAt: new Date('2023-01-01T10:00:00Z')
  },
  {
    id: '2',
    userId: 'user1',
    type: 'mention',
    title: 'You were mentioned',
    content: '@user1 check this out',
    chatRoomId: 'room2',
    isRead: false,
    priority: 'high',
    createdAt: new Date('2023-01-01T10:05:00Z')
  },
  {
    id: '3',
    userId: 'user1',
    type: 'group_activity',
    title: 'Group Update',
    content: 'John joined the group',
    chatRoomId: 'room3',
    isRead: true,
    priority: 'normal',
    createdAt: new Date('2023-01-01T09:30:00Z')
  }
];

describe('NotificationManager', () => {
  const mockOnMarkAsRead = jest.fn();
  const mockOnClearAll = jest.fn();
  const mockOnNotificationClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders floating notifications for unread notifications', () => {
    render(
      <NotificationManager
        notifications={mockNotifications}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
        onNotificationClick={mockOnNotificationClick}
      />
    );

    // Should show floating notifications for unread items
    expect(screen.getByText('New Message')).toBeInTheDocument();
    expect(screen.getByText('You were mentioned')).toBeInTheDocument();
    expect(screen.getByText('Hello there!')).toBeInTheDocument();
  });

  test('shows notification toggle with correct unread count', () => {
    render(
      <NotificationManager
        notifications={mockNotifications}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
      />
    );

    const toggleButton = screen.getByLabelText('2 unread notifications');
    expect(toggleButton).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Badge count
  });

  test('opens notification panel when toggle is clicked', () => {
    render(
      <NotificationManager
        notifications={mockNotifications}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
      />
    );

    const toggleButton = screen.getByLabelText('2 unread notifications');
    fireEvent.click(toggleButton);

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  test('calls onMarkAsRead when notification is clicked', () => {
    render(
      <NotificationManager
        notifications={mockNotifications}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
        onNotificationClick={mockOnNotificationClick}
      />
    );

    // Click on a floating notification
    const notification = screen.getByText('New Message').closest('.floating-notification');
    fireEvent.click(notification!);

    expect(mockOnMarkAsRead).toHaveBeenCalledWith('1');
    expect(mockOnNotificationClick).toHaveBeenCalledWith(expect.objectContaining({
      id: '1',
      title: 'New Message',
      content: 'Hello there!'
    }));
  });

  test('calls onClearAll when clear all button is clicked', () => {
    render(
      <NotificationManager
        notifications={mockNotifications}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
      />
    );

    // Open panel
    const toggleButton = screen.getByLabelText('2 unread notifications');
    fireEvent.click(toggleButton);

    // Click clear all
    const clearAllButton = screen.getByText('Clear All');
    fireEvent.click(clearAllButton);

    expect(mockOnClearAll).toHaveBeenCalled();
  });

  test('dismisses floating notification when dismiss button is clicked', async () => {
    render(
      <NotificationManager
        notifications={mockNotifications}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
      />
    );

    const dismissButtons = screen.getAllByLabelText('Dismiss notification');
    fireEvent.click(dismissButtons[0]);

    // Should call onMarkAsRead with the first unread notification's ID
    expect(mockOnMarkAsRead).toHaveBeenCalledWith(expect.any(String));
  });

  test('shows correct notification icons based on type and priority', () => {
    render(
      <NotificationManager
        notifications={mockNotifications}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
      />
    );

    // Check for emoji icons (this is a basic check)
    expect(screen.getByText('💬')).toBeInTheDocument(); // Message icon
    expect(screen.getByText('🔴')).toBeInTheDocument(); // High priority icon
  });

  test('handles empty notifications list', () => {
    render(
      <NotificationManager
        notifications={[]}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
      />
    );

    // Should not show toggle button when no unread notifications
    expect(screen.queryByLabelText(/unread notifications/)).not.toBeInTheDocument();
  });

  test('auto-hides normal priority notifications after timeout', async () => {
    jest.useFakeTimers();
    
    const normalNotification: Notification = {
      id: '4',
      userId: 'user1',
      type: 'message',
      title: 'Auto-hide test',
      content: 'This should auto-hide',
      chatRoomId: 'room1',
      isRead: false,
      priority: 'normal',
      createdAt: new Date()
    };

    const { rerender } = render(
      <NotificationManager
        notifications={[]}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
      />
    );

    // Add notification
    rerender(
      <NotificationManager
        notifications={[normalNotification]}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
      />
    );

    expect(screen.getByText('Auto-hide test')).toBeInTheDocument();

    // Fast-forward time by 5 seconds
    jest.advanceTimersByTime(5000);

    // Wait for the notification to be hidden
    await waitFor(() => {
      const notification = screen.queryByText('Auto-hide test');
      if (notification) {
        expect(notification.closest('.floating-notification')).toHaveClass('hidden');
      }
    });

    jest.useRealTimers();
  });
});