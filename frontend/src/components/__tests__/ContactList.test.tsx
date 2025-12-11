import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ContactList from '../ContactList';
import { User } from '../../types/index';

const mockContacts: User[] = [
  {
    id: '1',
    username: 'Alice Johnson',
    email: 'alice@example.com',
    isOnline: true,
    lastSeen: new Date()
  },
  {
    id: '2',
    username: 'Bob Smith',
    email: 'bob@example.com',
    isOnline: false,
    lastSeen: new Date(Date.now() - 300000) // 5 minutes ago
  }
];

const mockProps = {
  contacts: mockContacts,
  onContactSelect: jest.fn(),
  onAddContact: jest.fn(),
  selectedContactId: undefined
};

describe('ContactList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders contact list with contacts', () => {
    render(<ContactList {...mockProps} />);
    
    expect(screen.getByText('Contacts')).toBeInTheDocument();
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
  });

  test('shows online status correctly', () => {
    render(<ContactList {...mockProps} />);
    
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText(/Last seen/)).toBeInTheDocument();
  });

  test('calls onContactSelect when contact is clicked', () => {
    render(<ContactList {...mockProps} />);
    
    const aliceContact = screen.getByText('Alice Johnson').closest('.contact-item');
    fireEvent.click(aliceContact!);
    
    expect(mockProps.onContactSelect).toHaveBeenCalledWith(mockContacts[0]);
  });

  test('shows add contact form when add button is clicked', () => {
    render(<ContactList {...mockProps} />);
    
    const addButton = screen.getByLabelText('Add new contact');
    fireEvent.click(addButton);
    
    expect(screen.getByPlaceholderText('Enter email address')).toBeInTheDocument();
  });

  test('filters contacts based on search term', () => {
    render(<ContactList {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search contacts...');
    fireEvent.change(searchInput, { target: { value: 'Alice' } });
    
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
  });
});