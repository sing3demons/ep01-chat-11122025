import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import './AuthPage.css';

type AuthMode = 'login' | 'register';

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');

  const switchToLogin = () => setMode('login');
  const switchToRegister = () => setMode('register');

  return (
    <div className="auth-page">
      <div className="auth-page__background">
        <div className="auth-page__container">
          <div className="auth-page__brand">
            <h1>💬 Chat App</h1>
            <p>Connect with friends and family instantly</p>
          </div>
          
          <div className="auth-page__form-container">
            {mode === 'login' ? (
              <LoginForm onSwitchToRegister={switchToRegister} />
            ) : (
              <RegisterForm onSwitchToLogin={switchToLogin} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;