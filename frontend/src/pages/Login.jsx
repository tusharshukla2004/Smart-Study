import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthAPI, Session } from '../api';
import { showToast, validateEmail, validatePassword } from '../utils';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrors({});
    let newErrors = {};
    let valid = true;

    if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address.';
      valid = false;
    }
    if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 6 characters.';
      valid = false;
    }

    if (!valid) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    const res = await AuthAPI.login(email, password);
    if (res && res.success) {
      Session.saveLogin(res.token, res.user);
      showToast('Welcome back! Redirecting...', 'success');
      setTimeout(() => navigate('/dashboard'), 1000);
    } else {
      showToast(res?.message || 'Login failed. Please check your credentials.', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page page-wrapper">
      <div className="auth-container">
        {/* Left Brand Panel */}
        <div className="auth-brand animate-fadeUp">
          <span className="auth-brand-logo">📚 Smart Study</span>
          <h2 className="auth-brand-title">Welcome <span>back!</span><br/>Ready to learn?</h2>
          <p className="auth-brand-desc">Your study partners are waiting. Log in to continue your academic journey with AI-powered tools and real-time collaboration.</p>
          <div className="auth-perks">
            <div className="auth-perk"><span>🤖</span> AI-matched study partners</div>
            <div className="auth-perk"><span>💬</span> Real-time group collaboration</div>
            <div className="auth-perk"><span>🎯</span> Goal tracking & streaks</div>
            <div className="auth-perk"><span>📊</span> Progress analytics</div>
          </div>
        </div>

        {/* Login Card */}
        <div className="auth-card animate-fadeUp delay-1">
          <div className="auth-header">
            <h1 className="auth-title">Sign In</h1>
            <p className="auth-subtitle">Enter your credentials to access your account</p>
          </div>

          <div className="social-login">
            <button type="button" className="social-login-btn" onClick={() => showToast('Google auth coming soon!', 'info')}>🌐 Google</button>
            <button type="button" className="social-login-btn" onClick={() => showToast('GitHub auth coming soon!', 'info')}>🐙 GitHub</button>
          </div>
          <div className="divider"><span className="divider-text">or continue with email</span></div>

          <form onSubmit={handleLogin} noValidate>
            <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon">📧</span>
                <input 
                  type="email" id="login-email" className="form-input" placeholder="you@example.com" 
                  value={email} onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({...prev, email: null})) }} 
                />
              </div>
              {errors.email && <div className="form-error">{errors.email}</div>}
            </div>
            <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
              <label className="form-label" htmlFor="login-password">
                Password
                <Link to="#" className="forgot-link">Forgot password?</Link>
              </label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input 
                  type={showPassword ? "text" : "password"} id="login-password" className="form-input" placeholder="Enter your password" 
                  value={password} onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({...prev, password: null})) }} 
                />
                <button type="button" className="input-toggle" aria-label="Toggle password" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
              {errors.password && <div className="form-error">{errors.password}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
              <input type="checkbox" id="remember-me" style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }} />
              <label htmlFor="remember-me" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', cursor: 'pointer' }}>Remember me for 30 days</label>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? '⏳ Signing in...' : 'Sign In →'}
            </button>
          </form>

          <p className="auth-footer-text">
            Don't have an account? <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 600 }}>Create one free →</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
