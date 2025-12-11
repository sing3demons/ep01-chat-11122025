import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GroupManager from '../GroupManager';
import { ChatRoom } from '../../types/index.ts 22-32-13-426';

// Mock WebSocket context
const mockWebSocketContext = {
  isConnected: true,
  sendMessage: jest.fn(),
  lastMessage: null,
  connectionStatus: 'connected' as const,
  reconnectAttempts: 0
};

jest.mock('../../contexts/WebSocketContext', () => ({
  useWebSocket: () => mockWebSocketContext
}));

describe('GroupManager', () => {
  const mockProps = {
    currentUserId: 'user1',
    onCreateGroup: jest.fn(),
    onAddMember: jest.fn(),
    onRemoveMember: jest.fn(),
    onUpdateRole: jest.fn(),
    onUpdateGroup: jest.fn(),
    onLeaveGroup: jest.fn(),
    onDeleteGroup: jest.fn()
  };

  const mockGroupChatRoom: ChatRoom = {
    id: 'group1',
    name: 'Test Group',
    type: 'group',
    participants: ['user1', 'user2', 'user3'],
    createdAt: new Date(),
    lastMessageAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders create group button when no chat room is provided', () => {
    render(<GroupManager {...mockProps} />);
    
    expect(screen.getByText('Create New Group')).toBeInTheDocument();
  });

  it('shows group creation form when create button is clicked', () => {
    render(<GroupManager {...mockProps} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Create New Group' }));
    
    expect(screen.getByRole('heading', { name: 'Create New Group' })).toBeInTheDocument();
    expect(screen.getByLabelText('Group Name')).toBeInTheDocument();
    expect(screen.getByText('Select Members')).toBeInTheDocument();
  });

  it('renders group details when group chat room is provided', () => {
    render(<GroupManager {...mockProps} chatRoom={mockGroupChatRoom} />);
    
    expect(screen.getByText('Test Group')).toBeInTheDocument();
    expect(screen.getByText(/members/)).toBeInTheDocument();
    expect(screen.getByText(/Show Members/)).toBeInTheDocument();
    expect(screen.getByText('Leave Group')).toBeInTheDocument();
  });

  it('shows member list when show members button is clicked', async () => {
    render(<GroupManager {...mockProps} chatRoom={mockGroupChatRoom} />);
    
    fireEvent.click(screen.getByText(/Show Members/));
    
    await waitFor(() => {
      expect(screen.getByText('Group Members')).toBeInTheDocument();
    });
  });

  it('shows add member form for admin users', async () => {
    render(<GroupManager {...mockProps} chatRoom={mockGroupChatRoom} />);
    
    fireEvent.click(screen.getByText('Add Member'));
    
    await waitFor(() => {
      expect(screen.getByText('Add New Member')).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter member's email")).toBeInTheDocument();
    });
  });

  it('calls onCreateGroup when create group form is submitted', async () => {
    render(<GroupManager {...mockProps} />);
    
    // Open create form
    fireEvent.click(screen.getByRole('button', { name: 'Create New Group' }));
    
    // Fill form
    fireEvent.change(screen.getByLabelText('Group Name'), {
      target: { value: 'New Test Group' }
    });
    
    // Select a member (mock user selection)
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Create Group' }));
    
    await waitFor(() => {
      expect(mockProps.onCreateGroup).toHaveBeenCalledWith(
        'New Test Group',
        expect.arrayContaining(['user1'])
      );
    });
  });

  it('calls onLeaveGroup when leave group button is clicked', async () => {
    // Mock window.confirm
    window.confirm = jest.fn(() => true);
    
    render(<GroupManager {...mockProps} chatRoom={mockGroupChatRoom} />);
    
    fireEvent.click(screen.getByText('Leave Group'));
    
    await waitFor(() => {
      expect(mockProps.onLeaveGroup).toHaveBeenCalledWith('group1');
    });
  });

  it('disables create group button when form is invalid', () => {
    render(<GroupManager {...mockProps} />);
    
    // Open create form
    fireEvent.click(screen.getByRole('button', { name: 'Create New Group' }));
    
    // Create Group button should be disabled when form is empty
    expect(screen.getByRole('button', { name: 'Create Group' })).toBeDisabled();
  });

  it('shows edit group name form when edit button is clicked', async () => {
    render(<GroupManager {...mockProps} chatRoom={mockGroupChatRoom} />);
    
    const editButton = screen.getByTitle('Edit group name');
    fireEvent.click(editButton);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Group')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  it('calls onUpdateGroup when group name is updated', async () => {
    render(<GroupManager {...mockProps} chatRoom={mockGroupChatRoom} />);
    
    // Click edit button
    const editButton = screen.getByTitle('Edit group name');
    fireEvent.click(editButton);
    
    // Change name
    const input = screen.getByDisplayValue('Test Group');
    fireEvent.change(input, { target: { value: 'Updated Group Name' } });
    
    // Save changes
    fireEvent.click(screen.getByText('Save'));
    
    await waitFor(() => {
      expect(mockProps.onUpdateGroup).toHaveBeenCalledWith('group1', 'Updated Group Name');
    });
  });
});