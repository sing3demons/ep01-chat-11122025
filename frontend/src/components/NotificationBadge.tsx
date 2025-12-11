// NotificationBadge component for displaying unread counts
import React from 'react';
import './NotificationBadge.css';

interface NotificationBadgeProps {
  count: number;
  priority?: 'normal' | 'high';
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxCount?: number;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  priority = 'normal',
  onClick,
  size = 'medium',
  position = 'top-right',
  maxCount = 99
}) => {
  // Don't render if count is 0
  if (count <= 0) {
    return null;
  }

  // Format count display
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  // Handle click
  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onClick) {
      onClick();
    }
  };

  return (
    <span
      className={`notification-badge ${priority} ${size} ${position} ${onClick ? 'clickable' : ''}`}
      onClick={onClick ? handleClick : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${count} unread notifications`}
    >
      {displayCount}
    </span>
  );
};

export default NotificationBadge;