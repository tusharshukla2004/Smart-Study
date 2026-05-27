import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthAPI } from '../api';
import { showToast, validateEmail, validatePassword } from '../utils';

const SUBJECTS = [
  { id: 'Mathematics', icon: '📐', label: 'Mathematics' },
  { id: 'Physics', icon: '⚛️', label: 'Physics' },
  { id: 'Chemistry', icon: '🧪', label: 'Chemistry' },
  { id: 'Biology', icon: '🧬', label: 'Biology' },
  { id: 'Computer Science', icon: '💻', label: 'CS' },
  { id: 'Algorithms', icon: '⚙️', label: 'Algorithms' },
  { id: 'Machine Learning', icon: '🤖', label: 'ML/AI' },
  { id: 'Economics', icon: '📈', label: 'Economics' },
  { id: 'Literature', icon: '📚', label: 'Literature' },
  { id: 'Psychology', icon: '🧠', label: 'Psychology' },
  { id: 'History', icon: '🏛️', label: 'History' },
  { id: 'Web Development', icon: '🌐', label: 'Web Dev' }
];

const Signup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    university: '',
    major: '',
    level: '',
    time: '',
    subjects: [],
    terms: false
  });

  const updateForm = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const toggleSubject = (subId) => {
    setFormData(prev => {
      const subs = prev.subjects.includes(subId) 
        ? prev.subjects.filter(s => s !== subId)
        : [...prev.subjects, subId];
      return { ...prev, subjects: subs };
    });
  };

  const getPasswordStrength = () => {
    const val = formData.password;
    if (!val) return { pct: 0, color: '', text: '' };
    if (val.length >= 10 && /[A-Z]/.test(val) && /[0-9]/.test(val) && /[^A-Za-z0-9]/.test(val)) 
      return { pct: 100, color: 'var(--success)', text: '🟢 Strong' };
    if (val.length >= 8 && /[A-Z]/.test(val)) 
      return { pct: 66, color: 'var(--warning)', text: '🟡 Medium' };
    if (val.length >= 6) 
      return { pct: 33, color: 'var(--danger)', text: '🔴 Weak' };
    return { pct: 10, color: 'var(--danger)', text: '🔴 Very Weak' };
  };

  const handleNextStep1 = () => {
    let newErrors = {};
    let valid = true;
    if (!formData.firstName.trim()) { newErrors.firstName = 'First name is required.'; valid = false; }
    if (!formData.lastName.trim()) { newErrors.lastName = 'Last name is required.'; valid = false; }
    if (!validateEmail(formData.email)) { newErrors.email = 'Enter a valid email address.'; valid = false; }
    if (!validatePassword(formData.password)) { newErrors.password = 'Password must be at least 6 characters.'; valid = false; }
    if (formData.password !== formData.confirmPassword) { newErrors.confirmPassword = 'Passwords do not match.'; valid = false; }

    if (valid) setStep(2);
    else setErrors(newErrors);
  };

  const handleNextStep2 = () => {
    let newErrors = {};
    let valid = true;
    if (!formData.university.trim()) { newErrors.university = 'University name is required.'; valid = false; }
    if (!formData.major.trim()) { newErrors.major = 'Major is required.'; valid = false; }
    if (!formData.level) { newErrors.level = 'Please select your study level.'; valid = false; }

    if (valid) setStep(3);
    else setErrors(newErrors);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!formData.terms) {
      setErrors({ terms: 'You must agree to the terms to continue.' });
      return;
    }

    setLoading(true);
    const apiData = {
      name: formData.firstName + ' ' + formData.lastName,
      email: formData.email,
      password: formData.password,
      university: formData.university,
      major: formData.major,
      level: formData.level,
      subjects: formData.subjects,
      availability: formData.time ? [formData.time] : [],
      studyPreferences: formData.time || '',
      avatar: (formData.firstName[0] + formData.lastName[0]).toUpperCase()
    };

    try {
      const res = await AuthAPI.signup(apiData);
      if (res && res.success) {
        localStorage.setItem('ss_token', res.token);
        localStorage.setItem('ss_user', JSON.stringify(res.user));
        showToast('Account created! Welcome to Smart Study 🎉', 'success');
        setTimeout(() => navigate('/dashboard'), 1200);
      } else {
        showToast(res?.message || 'Signup failed. Please try again.', 'error');
      }
    } catch (err) {
      showToast('Backend unavailable. Mocking signup...', 'info');
      localStorage.setItem('ss_token', 'mock_token');
      localStorage.setItem('ss_user', JSON.stringify({ name: apiData.name, avatar: apiData.avatar }));
      setTimeout(() => navigate('/dashboard'), 1200);
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength();

  return (
    <div className="auth-page page-wrapper">
      <div className="auth-card animate-fadeUp">
        <div className="auth-top">
          <span className="auth-logo">📚 Smart Study</span>
          <h1 className="auth-title">Create Your Account</h1>
          <p className="auth-subtitle">Join 50,000+ students studying smarter</p>
        </div>

        {/* Step Indicator */}
        <div className="step-indicator">
          <div className={`step-dot ${step > 1 ? 'done' : 'active'}`}>{step > 1 ? '✓' : '1'}</div>
          <div className={`step-line ${step > 1 ? 'done' : ''}`}></div>
          <div className={`step-dot ${step > 2 ? 'done' : step === 2 ? 'active' : 'pending'}`}>{step > 2 ? '✓' : '2'}</div>
          <div className={`step-line ${step > 2 ? 'done' : ''}`}></div>
          <div className={`step-dot ${step === 3 ? 'active' : 'pending'}`}>3</div>
        </div>

        <div className="social-login">
          <button type="button" className="social-login-btn" onClick={() => showToast('Google auth coming soon!','info')}>🌐 Google</button>
          <button type="button" className="social-login-btn" onClick={() => showToast('GitHub auth coming soon!','info')}>🐙 GitHub</button>
        </div>
        <div className="divider"><span className="divider-text">or fill the form</span></div>

        <form onSubmit={handleSignup} noValidate>
          {/* Step 1 */}
          <div className={`form-step ${step === 1 ? 'active' : ''}`}>
            <div className="form-row">
              <div className={`form-group ${errors.firstName ? 'has-error' : ''}`}>
                <label className="form-label">First Name</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input type="text" name="firstName" className="form-input" placeholder="Alex" value={formData.firstName} onChange={updateForm} />
                </div>
                {errors.firstName && <div className="form-error">{errors.firstName}</div>}
              </div>
              <div className={`form-group ${errors.lastName ? 'has-error' : ''}`}>
                <label className="form-label">Last Name</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input type="text" name="lastName" className="form-input" placeholder="Jordan" value={formData.lastName} onChange={updateForm} />
                </div>
                {errors.lastName && <div className="form-error">{errors.lastName}</div>}
              </div>
            </div>
            <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon">📧</span>
                <input type="email" name="email" className="form-input" placeholder="alex@university.edu" value={formData.email} onChange={updateForm} />
              </div>
              {errors.email && <div className="form-error">{errors.email}</div>}
            </div>
            <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input type={showPassword ? "text" : "password"} name="password" className="form-input" placeholder="At least 6 characters" value={formData.password} onChange={updateForm} />
                <button type="button" className="input-toggle" onClick={() => setShowPassword(!showPassword)}>👁️</button>
              </div>
              <div className="strength-bar" style={{ width: `${strength.pct}%`, background: strength.color, height: strength.pct ? '4px' : '0' }}></div>
              <div className="strength-label" style={{ color: strength.color }}>{strength.text}</div>
              {errors.password && <div className="form-error">{errors.password}</div>}
            </div>
            <div className={`form-group ${errors.confirmPassword ? 'has-error' : ''}`}>
              <label className="form-label">Confirm Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input type={showConfirm ? "text" : "password"} name="confirmPassword" className="form-input" placeholder="Repeat your password" value={formData.confirmPassword} onChange={updateForm} />
                <button type="button" className="input-toggle" onClick={() => setShowConfirm(!showConfirm)}>👁️</button>
              </div>
              {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
            </div>
            <button type="button" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleNextStep1}>Next: Academic Info →</button>
          </div>

          {/* Step 2 */}
          <div className={`form-step ${step === 2 ? 'active' : ''}`}>
            <div className={`form-group ${errors.university ? 'has-error' : ''}`}>
              <label className="form-label">University / School</label>
              <div className="input-wrapper">
                <span className="input-icon">🏫</span>
                <input type="text" name="university" className="form-input" placeholder="e.g. MIT, Stanford..." value={formData.university} onChange={updateForm} />
              </div>
              {errors.university && <div className="form-error">{errors.university}</div>}
            </div>
            <div className={`form-group ${errors.major ? 'has-error' : ''}`}>
              <label className="form-label">Major / Field of Study</label>
              <div className="input-wrapper">
                <span className="input-icon">📖</span>
                <input type="text" name="major" className="form-input" placeholder="e.g. Computer Science" value={formData.major} onChange={updateForm} />
              </div>
              {errors.major && <div className="form-error">{errors.major}</div>}
            </div>
            <div className={`form-group ${errors.level ? 'has-error' : ''}`}>
              <label className="form-label">Study Level</label>
              <select name="level" className="form-select" value={formData.level} onChange={updateForm}>
                <option value="">Select level...</option>
                <option>Undergraduate (Year 1)</option>
                <option>Undergraduate (Year 2)</option>
                <option>Undergraduate (Year 3)</option>
                <option>Undergraduate (Year 4)</option>
                <option>Postgraduate / Masters</option>
                <option>PhD / Doctoral</option>
              </select>
              {errors.level && <div className="form-error">{errors.level}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Preferred Study Time</label>
              <select name="time" className="form-select" value={formData.time} onChange={updateForm}>
                <option value="">Select preference...</option>
                <option>Morning (6am – 12pm)</option>
                <option>Afternoon (12pm – 6pm)</option>
                <option>Evening (6pm – 10pm)</option>
                <option>Night (10pm+)</option>
                <option>Flexible</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(1)}>← Back</button>
              <button type="button" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={handleNextStep2}>Next: Subjects →</button>
            </div>
          </div>

          {/* Step 3 */}
          <div className={`form-step ${step === 3 ? 'active' : ''}`}>
            <div className="form-group">
              <label className="form-label">Subjects You're Studying <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(select all that apply)</span></label>
              <div className="subject-chips">
                {SUBJECTS.map(sub => (
                  <div key={sub.id} className={`chip ${formData.subjects.includes(sub.id) ? 'selected' : ''}`} onClick={() => toggleSubject(sub.id)}>
                    {sub.icon} {sub.label}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '1.25rem' }}>
              <input type="checkbox" name="terms" id="s-terms" checked={formData.terms} onChange={updateForm} style={{ accentColor: 'var(--primary)', width: '16px', height: '16px', marginTop: '3px', flexShrink: 0 }} />
              <label htmlFor="s-terms" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1.5 }}>
                I agree to the <Link to="#" style={{ color: 'var(--primary)' }}>Terms of Service</Link> and <Link to="#" style={{ color: 'var(--primary)' }}>Privacy Policy</Link>
              </label>
            </div>
            {errors.terms && <div style={{ fontSize: '0.78rem', color: 'var(--danger)', marginBottom: '1rem' }}>{errors.terms}</div>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(2)}>← Back</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={loading}>
                {loading ? '⏳ Creating...' : '🚀 Create Account'}
              </button>
            </div>
          </div>
        </form>

        <p className="auth-footer-text">
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in →</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
