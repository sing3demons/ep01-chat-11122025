import React, { useState } from 'react';
import { ContactListProps } from '../interfaces/components';
import { User } from '../types/index.ts 22-32-13-426';
import './ContactList.css';

const ContactList: React.FC<ContactListProps> = ({
  contacts,
  onContactSelect,
  onAddContact,
  selectedContactId
}) => {
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactEmail, setNewContactEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    
    const email = newContactEmail.trim();
    if (!email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address');
      return;
    }

    onAddContact(email);
    setNewContactEmail('');
    setShowAddContact(false);
  };

  const formatLastSeen = (lastSeen: Date) => {
    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return lastSeen.toLocaleDateString();
  };

  const filteredContacts = contacts.filter((contact: User) =>
    contact.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="contact-list">
      <div className="contact-list-header">
        <h3>Contacts</h3>
        <button
          className="add-contact-btn"
          onClick={() => setShowAddContact(!showAddContact)}
          aria-label="Add new contact"
        >
          +
        </button>
      </div>

      {showAddContact && (
        <div className="add-contact-form">
          <form onSubmit={handleAddContact}>
            <input
              type="email"
              value={newContactEmail}
              onChange={(e) => setNewContactEmail(e.target.value)}
              placeholder="Enter email address"
              className="add-contact-input"
              autoFocus
            />
            <div className="add-contact-actions">
              <button type="submit" className="btn-primary">
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddContact(false);
                  setNewContactEmail('');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="search-container">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search contacts..."
          className="search-input"
        />
      </div>

      <div className="contacts-container">
        {filteredContacts.length === 0 ? (
          <div className="no-contacts">
            {searchTerm ? 'No contacts found' : 'No contacts yet'}
          </div>
        ) : (
          filteredContacts.map((contact: User) => (
            <div
              key={contact.id}
              className={`contact-item ${
                selectedContactId === contact.id ? 'selected' : ''
              }`}
              onClick={() => onContactSelect(contact)}
            >
              <div className="contact-avatar">
                <div className="avatar-circle">
                  {contact.username.charAt(0).toUpperCase()}
                </div>
                <div className={`status-indicator ${contact.isOnline ? 'online' : 'offline'}`} />
              </div>
              
              <div className="contact-info">
                <div className="contact-name">{contact.username}</div>
                <div className="contact-status">
                  {contact.isOnline ? (
                    <span className="online-status">Online</span>
                  ) : (
                    <span className="offline-status">
                      Last seen {formatLastSeen(contact.lastSeen)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ContactList;