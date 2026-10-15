import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Session } from '../api';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isLoggedIn = Session.isLoggedIn();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Check initial theme
    setIsLightMode(document.body.classList.contains('light-mode'));
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    setIsLightMode(isLight);
    localStorage.setItem('ss_theme', isLight ? 'light' : 'dark');
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const handleLogout = () => {
    localStorage.removeItem('ss_token');
    localStorage.removeItem('ss_user');
    navigate('/');
  };

  return (
    <>
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`} id="navbar">
        <Link to="/" className="nav-brand">📚 Smart Study</Link>
        <div className="nav-links">
          <Link to="/" className={isActive('/')}>Home</Link>
          {isLoggedIn && (
            <>
              <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
              <Link to="/groups" className={isActive('/groups')}>Groups</Link>
              <Link to="/chat" className={isActive('/chat')}>Chat</Link>
              <Link to="/tasks" className={isActive('/tasks')}>Tasks</Link>
            </>
          )}
        </div>
        <div className="nav-actions">
          <button className="theme-toggle" aria-label="Toggle theme" onClick={toggleTheme}></button>
          {isLoggedIn ? (
            <>
              <Link to="/profile" className="btn btn-ghost btn-sm">Profile</Link>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </div>
        <div className={`hamburger ${menuOpen ? 'open' : ''}`} onClick={toggleMenu}>
          <span style={menuOpen ? { transform: 'rotate(45deg) translate(5px, 5px)' } : {}}></span>
          <span style={menuOpen ? { opacity: '0' } : {}}></span>
          <span style={menuOpen ? { transform: 'rotate(-45deg) translate(5px, -5px)' } : {}}></span>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`} id="mobile-menu">
        <Link to="/" onClick={toggleMenu}>🏠 Home</Link>
        {isLoggedIn ? (
          <>
            <Link to="/dashboard" onClick={toggleMenu}>📊 Dashboard</Link>
            <Link to="/groups" onClick={toggleMenu}>👥 Groups</Link>
            <Link to="/chat" onClick={toggleMenu}>💬 Chat</Link>
            <Link to="/tasks" onClick={toggleMenu}>✅ Tasks</Link>
            <Link to="/profile" onClick={toggleMenu}>👤 Profile</Link>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { toggleMenu(); handleLogout(); }}>Logout</button>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <Link to="/login" className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={toggleMenu}>Login</Link>
            <Link to="/signup" className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={toggleMenu}>Sign Up</Link>
          </div>
        )}
      </div>
    </>
  );
};

export default Navbar;
