import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthPage from '../AuthPage';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock fetch for API calls
global.fetch = jest.fn();

const renderWithAuthProvider = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

describe('AuthPage', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('renders login form by default', () => {
    renderWithAuthProvider(<AuthPage />);
    
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to continue to your conversations')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('switches to register form when Sign Up is clicked', () => {
    renderWithAuthProvider(<AuthPage />);
    
    const signUpButton = screen.getByRole('button', { name: 'Sign Up' });
    fireEvent.click(signUpButton);
    
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
    expect(screen.getByText('Join the conversation and connect with others')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
  });

  it('switches back to login form when Sign In is clicked from register form', () => {
    renderWithAuthProvider(<AuthPage />);
    
    // Switch to register
    const signUpButton = screen.getByRole('button', { name: 'Sign Up' });
    fireEvent.click(signUpButton);
    
    // Switch back to login
    const signInButton = screen.getByRole('button', { name: 'Sign In' });
    fireEvent.click(signInButton);
    
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('displays brand information', () => {
    renderWithAuthProvider(<AuthPage />);
    
    expect(screen.getByText('💬 Chat App')).toBeInTheDocument();
    expect(screen.getByText('Connect with friends and family instantly')).toBeInTheDocument();
  });

  it('handles login form submission', async () => {
    const mockResponse = {
      success: true,
      data: {
        user: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          isOnline: true,
          lastSeen: new Date(),
        },
        token: 'mock-jwt-token',
      },
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    renderWithAuthProvider(<AuthPage />);
    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        })
      );
    });
  });

  it('handles register form submission', async () => {
    const mockResponse = {
      success: true,
      data: {
        user: {
          id: '1',
          username: 'newuser',
          email: 'new@example.com',
          isOnline: true,
          lastSeen: new Date(),
        },
        token: 'mock-jwt-token',
      },
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    renderWithAuthProvider(<AuthPage />);
    
    // Switch to register form
    const signUpButton = screen.getByRole('button', { name: 'Sign Up' });
    fireEvent.click(signUpButton);
    
    const usernameInput = screen.getByLabelText('Username');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: 'Create Account' });
    
    fireEvent.change(usernameInput, { target: { value: 'newuser' } });
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/register',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: 'newuser',
            email: 'new@example.com',
            password: 'password123',
          }),
        })
      );
    });
  });
});