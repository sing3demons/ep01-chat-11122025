import React, { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoginRequest } from '../types';
import './LoginForm.css';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { login, loading, error, clearError } = useAuth();
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      return;
    }

    try {
      await login(formData);
    } catch (error) {
      // Error is handled by the auth context
    }
  };

  const isFormValid = formData.email.trim() !== '' && formData.password.trim() !== '';

  return (
    <div className="login-form">
      <div className="login-form__header">
        <h2>Welcome Back</h2>
        <p>Sign in to continue to your conversations</p>
      </div>

      <form onSubmit={handleSubmit} className="login-form__form">
        {error && (
          <div className="login-form__error">
            {error}
          </div>
        )}

        <div className="login-form__field">
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

        <div className="login-form__field">
          <label htmlFor="password">Password</label>
          <div className="login-form__password-input">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              required
              disabled={loading}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="login-form__password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="login-form__submit"
          disabled={!isFormValid || loading}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <div className="login-form__footer">
        <p>
          Don't have an account?{' '}
          <button
            type="button"
            className="login-form__switch"
            onClick={onSwitchToRegister}
            disabled={loading}
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;