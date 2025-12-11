import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './UserProfile.css';

interface UserProfileProps {
  onClose: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    onClose();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="user-profile">
      <div className="user-profile__overlay" onClick={onClose} />
      <div className="user-profile__modal">
        <div className="user-profile__header">
          <h2>Profile</h2>
          <button
            className="user-profile__close"
            onClick={onClose}
            aria-label="Close profile"
          >
            ✕
          </button>
        </div>

        <div className="user-profile__content">
          <div className="user-profile__avatar">
            <div className="user-profile__avatar-circle">
              {user.username.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="user-profile__info">
            <div className="user-profile__field">
              <label>Username</label>
              <div className="user-profile__value">{user.username}</div>
            </div>

            <div className="user-profile__field">
              <label>Email</label>
              <div className="user-profile__value">{user.email}</div>
            </div>

            <div className="user-profile__field">
              <label>Status</label>
              <div className="user-profile__value">
                <span className={`user-profile__status ${user.isOnline ? 'online' : 'offline'}`}>
                  {user.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            {!user.isOnline && user.lastSeen && (
              <div className="user-profile__field">
                <label>Last Seen</label>
                <div className="user-profile__value">
                  {formatDate(user.lastSeen)}
                </div>
              </div>
            )}

            <div className="user-profile__field">
              <label>Member Since</label>
              <div className="user-profile__value">
                {user.createdAt ? formatDate(user.createdAt) : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        <div className="user-profile__actions">
          {!showLogoutConfirm ? (
            <button
              className="user-profile__logout"
              onClick={() => setShowLogoutConfirm(true)}
            >
              Sign Out
            </button>
          ) : (
            <div className="user-profile__logout-confirm">
              <p>Are you sure you want to sign out?</p>
              <div className="user-profile__logout-buttons">
                <button
                  className="user-profile__logout-cancel"
                  onClick={() => setShowLogoutConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="user-profile__logout-confirm-btn"
                  onClick={handleLogout}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;