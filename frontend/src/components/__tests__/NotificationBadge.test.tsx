// NotificationBadge component tests
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationBadge from '../NotificationBadge';

describe('NotificationBadge', () => {
  test('renders with correct count', () => {
    render(<NotificationBadge count={5} />);
    
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByLabelText('5 unread notifications')).toBeInTheDocument();
  });

  test('does not render when count is 0', () => {
    const { container } = render(<NotificationBadge count={0} />);
    
    expect(container.firstChild).toBeNull();
  });

  test('shows "99+" when count exceeds maxCount', () => {
    render(<NotificationBadge count={150} maxCount={99} />);
    
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  test('applies correct priority class', () => {
    const { rerender } = render(<NotificationBadge count={1} priority="normal" />);
    
    expect(screen.getByText('1')).toHaveClass('normal');
    
    rerender(<NotificationBadge count={1} priority="high" />);
    expect(screen.getByText('1')).toHaveClass('high');
  });

  test('applies correct size class', () => {
    const { rerender } = render(<NotificationBadge count={1} size="small" />);
    
    expect(screen.getByText('1')).toHaveClass('small');
    
    rerender(<NotificationBadge count={1} size="large" />);
    expect(screen.getByText('1')).toHaveClass('large');
  });

  test('applies correct position class', () => {
    render(<NotificationBadge count={1} position="top-left" />);
    
    expect(screen.getByText('1')).toHaveClass('top-left');
  });

  test('calls onClick when clicked and clickable', () => {
    const mockOnClick = jest.fn();
    render(<NotificationBadge count={1} onClick={mockOnClick} />);
    
    const badge = screen.getByText('1');
    expect(badge).toHaveClass('clickable');
    
    fireEvent.click(badge);
    expect(mockOnClick).toHaveBeenCalled();
  });

  test('stops event propagation when clicked', () => {
    const mockOnClick = jest.fn();
    const mockParentClick = jest.fn();
    
    render(
      <div onClick={mockParentClick}>
        <NotificationBadge count={1} onClick={mockOnClick} />
      </div>
    );
    
    const badge = screen.getByText('1');
    fireEvent.click(badge);
    
    expect(mockOnClick).toHaveBeenCalled();
    expect(mockParentClick).not.toHaveBeenCalled();
  });

  test('is not clickable when no onClick provided', () => {
    render(<NotificationBadge count={1} />);
    
    const badge = screen.getByText('1');
    expect(badge).not.toHaveClass('clickable');
    expect(badge).not.toHaveAttribute('role', 'button');
  });

  test('has proper accessibility attributes when clickable', () => {
    const mockOnClick = jest.fn();
    render(<NotificationBadge count={3} onClick={mockOnClick} />);
    
    const badge = screen.getByText('3');
    expect(badge).toHaveAttribute('role', 'button');
    expect(badge).toHaveAttribute('tabIndex', '0');
    expect(badge).toHaveAttribute('aria-label', '3 unread notifications');
  });
});