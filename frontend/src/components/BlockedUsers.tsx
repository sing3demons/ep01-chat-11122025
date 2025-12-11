import React, { useState } from 'react';
import { User } from '../types/index';
import './BlockedUsers.css';

interface BlockedUsersProps {
  blockedUsers: User[];
  onUnblockUser: (userId: string) => void;
}

const BlockedUsers: React.FC<BlockedUsersProps> = ({
  blockedUsers,
  onUnblockUser
}) => {
  const [showUnblockConfirm, setShowUnblockConfirm] = useState<string | null>(null);

  const handleUnblockUser = (userId: string) => {
    onUnblockUser(userId);
    setShowUnblockConfirm(null);
  };

  return (
    <div className="blocked-users">
      <div className="blocked-users-header">
        <h3>Blocked Users</h3>
        <p className="blocked-users-description">
          Users you've blocked won't be able to send you messages or see your online status.
        </p>
      </div>

      <div className="blocked-users-list">
        {blockedUsers.length === 0 ? (
          <div className="no-blocked-users">
            <p>No blocked users</p>
          </div>
        ) : (
          blockedUsers.map((user) => (
            <div key={user.id} className="blocked-user-item">
              <div className="user-avatar">
                <div className="avatar-circle">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              </div>
              
              <div className="user-info">
                <div className="user-name">{user.username}</div>
                <div className="user-email">{user.email}</div>
              </div>
              
              <button
                className="unblock-btn"
                onClick={() => setShowUnblockConfirm(user.id)}
                title="Unblock user"
              >
                Unblock
              </button>
            </div>
          ))
        )}
      </div>

      {/* Unblock Confirmation Modal */}
      {showUnblockConfirm && (
        <div className="modal-overlay" onClick={() => setShowUnblockConfirm(null)}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Unblock User</h3>
            <p>
              Are you sure you want to unblock this user? They will be able to 
              send you messages and see your online status again.
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowUnblockConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => handleUnblockUser(showUnblockConfirm)}
              >
                Unblock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockedUsers;