import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">📚 Smart Study</div>
            <p className="footer-desc">AI-powered platform connecting students worldwide for smarter, more collaborative learning experiences.</p>
            <div className="footer-social">
              <a className="social-btn" href="#" title="Twitter">𝕏</a>
              <a className="social-btn" href="#" title="LinkedIn">in</a>
              <a className="social-btn" href="#" title="Discord">💬</a>
              <a className="social-btn" href="#" title="Instagram">📸</a>
            </div>
          </div>
          <div>
            <div className="footer-heading">Platform</div>
            <div className="footer-links">
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/groups">Study Groups</Link>
              <Link to="/chat">Collaboration</Link>
              <Link to="/tasks">Goal Tracker</Link>
            </div>
          </div>
          <div>
            <div className="footer-heading">Account</div>
            <div className="footer-links">
              <Link to="/login">Login</Link>
              <Link to="/signup">Sign Up</Link>
              <Link to="/profile">Profile</Link>
            </div>
          </div>
          <div>
            <div className="footer-heading">Company</div>
            <div className="footer-links">
              <a href="#">About Us</a>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Smart Study. All rights reserved.</span>
          <span>Made with ❤️ for students everywhere</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
