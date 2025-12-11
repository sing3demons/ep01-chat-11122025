import React, { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { RegisterRequest } from '../types';
import './RegisterForm.css';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { register, loading, error, clearError } = useAuth();
  const [formData, setFormData] = useState<RegisterRequest>({
    username: '',
    email: '',
    password: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'confirmPassword') {
      setConfirmPassword(value);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
    
    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      return;
    }

    if (formData.password !== confirmPassword) {
      return;
    }

    try {
      await register(formData);
    } catch (error) {
      // Error is handled by the auth context
    }
  };

  const isFormValid = 
    formData.username.trim() !== '' &&
    formData.email.trim() !== '' &&
    formData.password.trim() !== '' &&
    confirmPassword.trim() !== '' &&
    formData.password === confirmPassword;

  const passwordsMatch = formData.password === confirmPassword;

  return (
    <div className="register-form">
      <div className="register-form__header">
        <h2>Create Account</h2>
        <p>Join the conversation and connect with others</p>
      </div>

      <form onSubmit={handleSubmit} className="register-form__form">
        {error && (
          <div className="register-form__error">
            {error}
          </div>
        )}

        <div className="register-form__field">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            placeholder="Choose a username"
            required
            disabled={loading}
            autoComplete="username"
            minLength={3}
            maxLength={50}
          />
        </div>

        <div className="register-form__field">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter your email"
            required
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div className="register-form__field">
          <label htmlFor="password">Password</label>
          <div className="register-form__password-input">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Create a password"
              required
              disabled={loading}
              autoComplete="new-password"
              minLength={8}
            />
            <button
              type="button"
              className="register-form__password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          <div className="register-form__password-hint">
            Password must be at least 8 characters long
          </div>
        </div>

        <div className="register-form__field">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <div className="register-form__password-input">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm your password"
              required
              disabled={loading}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="register-form__password-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={loading}
            >
              {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {confirmPassword && !passwordsMatch && (
            <div className="register-form__password-error">
              Passwords do not match
            </div>
          )}
        </div>

        <button
          type="submit"
          className="register-form__submit"
          disabled={!isFormValid || loading}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="register-form__footer">
        <p>
          Already have an account?{' '}
          <button
            type="button"
            className="register-form__switch"
            onClick={onSwitchToLogin}
            disabled={loading}
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;