import React, { useState, useEffect, useCallback } from 'react';
import { ChatRoom, User } from '../types/index';
import { useWebSocket } from '../contexts/WebSocketContext';
import './GroupManager.css';

interface GroupMember {
  userId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  user: User;
}

interface GroupManagerProps {
  chatRoom?: ChatRoom;
  currentUserId: string;
  onCreateGroup: (name: string, participants: string[]) => void;
  onAddMember: (chatRoomId: string, userId: string) => void;
  onRemoveMember: (chatRoomId: string, userId: string) => void;
  onUpdateRole: (chatRoomId: string, userId: string, role: 'admin' | 'member') => void;
  onUpdateGroup: (chatRoomId: string, name: string) => void;
  onLeaveGroup: (chatRoomId: string) => void;
  onDeleteGroup: (chatRoomId: string) => void;
}

const GroupManager: React.FC<GroupManagerProps> = ({
  chatRoom,
  currentUserId,
  onCreateGroup,
  onAddMember,
  onRemoveMember,
  onUpdateRole,
  onUpdateGroup,
  onLeaveGroup,
  onDeleteGroup
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [showMemberList, setShowMemberList] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isConnected } = useWebSocket();

  const loadGroupMembers = useCallback(async () => {
    if (!chatRoom) return;
    
    setLoading(true);
    try {
      // Mock group members data (in real app, this would come from API)
      const mockMembers: GroupMember[] = [
        {
          userId: currentUserId,
          role: 'admin',
          joinedAt: new Date(Date.now() - 86400000), // 1 day ago
          user: {
            id: currentUserId,
            username: 'You',
            email: 'you@example.com',
            isOnline: true,
            lastSeen: new Date()
          }
        },
        {
          userId: '2',
          role: 'member',
          joinedAt: new Date(Date.now() - 43200000), // 12 hours ago
          user: {
            id: '2',
            username: 'Alice Johnson',
            email: 'alice@example.com',
            isOnline: true,
            lastSeen: new Date()
          }
        },
        {
          userId: '3',
          role: 'member',
          joinedAt: new Date(Date.now() - 21600000), // 6 hours ago
          user: {
            id: '3',
            username: 'Bob Smith',
            email: 'bob@example.com',
            isOnline: false,
            lastSeen: new Date(Date.now() - 300000)
          }
        }
      ];
      
      setGroupMembers(mockMembers);
    } catch (err) {
      setError('Failed to load group members');
    } finally {
      setLoading(false);
    }
  }, [chatRoom, currentUserId]);

  // Initialize group data when chatRoom changes
  useEffect(() => {
    if (chatRoom && chatRoom.type === 'group') {
      setGroupName(chatRoom.name || '');
      loadGroupMembers();
    } else {
      setGroupName('');
      setGroupMembers([]);
    }
  }, [chatRoom, loadGroupMembers]);

  // Mock data for available users (in real app, this would come from API)
  useEffect(() => {
    setAvailableUsers([
      {
        id: '2',
        username: 'Alice Johnson',
        email: 'alice@example.com',
        isOnline: true,
        lastSeen: new Date()
      },
      {
        id: '3',
        username: 'Bob Smith',
        email: 'bob@example.com',
        isOnline: false,
        lastSeen: new Date(Date.now() - 300000)
      },
      {
        id: '4',
        username: 'Carol Davis',
        email: 'carol@example.com',
        isOnline: true,
        lastSeen: new Date()
      }
    ]);
  }, []);

  const isCurrentUserAdmin = () => {
    const currentMember = groupMembers.find(m => m.userId === currentUserId);
    return currentMember?.role === 'admin';
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      setError('Please enter a group name and select at least one member');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Include current user in participants
      const participants = [currentUserId, ...selectedUsers];
      await onCreateGroup(groupName.trim(), participants);
      
      // Reset form
      setGroupName('');
      setSelectedUsers([]);
      setIsCreating(false);
    } catch (err) {
      setError('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!chatRoom || !groupName.trim()) {
      setError('Please enter a valid group name');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await onUpdateGroup(chatRoom.id, groupName.trim());
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update group');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!chatRoom || !newMemberEmail.trim()) {
      setError('Please enter a valid email address');
      return;
    }

    // Find user by email
    const user = availableUsers.find(u => u.email === newMemberEmail.trim());
    if (!user) {
      setError('User not found');
      return;
    }

    // Check if user is already a member
    if (groupMembers.some(m => m.userId === user.id)) {
      setError('User is already a member of this group');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await onAddMember(chatRoom.id, user.id);
      setNewMemberEmail('');
      setShowAddMember(false);
      await loadGroupMembers(); // Refresh member list
    } catch (err) {
      setError('Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!chatRoom) return;

    if (window.confirm('Are you sure you want to remove this member?')) {
      setLoading(true);
      setError(null);
      
      try {
        await onRemoveMember(chatRoom.id, userId);
        await loadGroupMembers(); // Refresh member list
      } catch (err) {
        setError('Failed to remove member');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'member') => {
    if (!chatRoom) return;

    setLoading(true);
    setError(null);
    
    try {
      await onUpdateRole(chatRoom.id, userId, newRole);
      await loadGroupMembers(); // Refresh member list
    } catch (err) {
      setError('Failed to update member role');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!chatRoom) return;

    if (window.confirm('Are you sure you want to leave this group?')) {
      setLoading(true);
      setError(null);
      
      try {
        await onLeaveGroup(chatRoom.id);
      } catch (err) {
        setError('Failed to leave group');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteGroup = async () => {
    if (!chatRoom) return;

    if (window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      setLoading(true);
      setError(null);
      
      try {
        await onDeleteGroup(chatRoom.id);
      } catch (err) {
        setError('Failed to delete group');
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  if (!isConnected) {
    return (
      <div className="group-manager offline">
        <div className="offline-message">
          <h3>Offline</h3>
          <p>Group management is not available while offline</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group-manager">
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Create New Group */}
      {!chatRoom && (
        <div className="group-actions">
          <button 
            className="create-group-btn"
            onClick={() => setIsCreating(true)}
            disabled={loading}
          >
            Create New Group
          </button>
        </div>
      )}

      {/* Group Creation Form */}
      {isCreating && (
        <div className="group-form">
          <h3>Create New Group</h3>
          
          <div className="form-group">
            <label htmlFor="groupName">Group Name</label>
            <input
              id="groupName"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label>Select Members</label>
            <div className="user-selection">
              {availableUsers.map(user => (
                <div key={user.id} className="user-option">
                  <input
                    type="checkbox"
                    id={`user-${user.id}`}
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                  />
                  <label htmlFor={`user-${user.id}`}>
                    <div className="user-info">
                      <span className="username">{user.username}</span>
                      <span className="email">{user.email}</span>
                      <span className={`status ${user.isOnline ? 'online' : 'offline'}`}>
                        {user.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button 
              onClick={handleCreateGroup}
              disabled={loading || !groupName.trim() || selectedUsers.length === 0}
              className="primary"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
            <button 
              onClick={() => {
                setIsCreating(false);
                setGroupName('');
                setSelectedUsers([]);
                setError(null);
              }}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Existing Group Management */}
      {chatRoom && chatRoom.type === 'group' && (
        <div className="group-details">
          <div className="group-header">
            {isEditing ? (
              <div className="edit-group-name">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name"
                  maxLength={100}
                />
                <div className="edit-actions">
                  <button 
                    onClick={handleUpdateGroup}
                    disabled={loading || !groupName.trim()}
                    className="save-btn"
                  >
                    Save
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setGroupName(chatRoom.name || '');
                      setError(null);
                    }}
                    disabled={loading}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="group-info">
                <h3>{chatRoom.name || 'Unnamed Group'}</h3>
                <span className="member-count">{groupMembers.length} members</span>
                {isCurrentUserAdmin() && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="edit-btn"
                    title="Edit group name"
                  >
                    ✏️
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="group-actions">
            <button 
              onClick={() => setShowMemberList(!showMemberList)}
              className="toggle-members-btn"
            >
              {showMemberList ? 'Hide Members' : 'Show Members'} ({groupMembers.length})
            </button>
            
            {isCurrentUserAdmin() && (
              <button 
                onClick={() => setShowAddMember(!showAddMember)}
                className="add-member-btn"
              >
                Add Member
              </button>
            )}
            
            <button 
              onClick={handleLeaveGroup}
              className="leave-group-btn"
              disabled={loading}
            >
              Leave Group
            </button>
            
            {isCurrentUserAdmin() && (
              <button 
                onClick={handleDeleteGroup}
                className="delete-group-btn"
                disabled={loading}
              >
                Delete Group
              </button>
            )}
          </div>

          {/* Add Member Form */}
          {showAddMember && isCurrentUserAdmin() && (
            <div className="add-member-form">
              <h4>Add New Member</h4>
              <div className="form-group">
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="Enter member's email"
                />
                <button 
                  onClick={handleAddMember}
                  disabled={loading || !newMemberEmail.trim()}
                  className="add-btn"
                >
                  {loading ? 'Adding...' : 'Add'}
                </button>
                <button 
                  onClick={() => {
                    setShowAddMember(false);
                    setNewMemberEmail('');
                    setError(null);
                  }}
                  disabled={loading}
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Member List */}
          {showMemberList && (
            <div className="member-list">
              <h4>Group Members</h4>
              {loading ? (
                <div className="loading">Loading members...</div>
              ) : (
                <div className="members">
                  {groupMembers.map(member => (
                    <div key={member.userId} className="member-item">
                      <div className="member-info">
                        <div className="member-avatar">
                          {member.user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="member-details">
                          <span className="member-name">
                            {member.userId === currentUserId ? 'You' : member.user.username}
                          </span>
                          <span className="member-email">{member.user.email}</span>
                          <span className={`member-status ${member.user.isOnline ? 'online' : 'offline'}`}>
                            {member.user.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        <div className="member-role">
                          <span className={`role-badge ${member.role}`}>
                            {member.role === 'admin' ? 'Admin' : 'Member'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Admin Controls */}
                      {isCurrentUserAdmin() && member.userId !== currentUserId && (
                        <div className="member-actions">
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.userId, e.target.value as 'admin' | 'member')}
                            disabled={loading}
                            className="role-select"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button 
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={loading}
                            className="remove-member-btn"
                            title="Remove member"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupManager;