import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../hooks/useRedux';
import { logout } from '../store/slices/authSlice';

const Sidebar = ({ onFindGroup, onAIMatch }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <aside className="sidebar">
      <Link to="/dashboard" className={`sidebar-item ${isActive('/dashboard')}`}>
        <span className="icon">📊</span> Dashboard
      </Link>
      <Link to="/groups" className={`sidebar-item ${isActive('/groups')}`}>
        <span className="icon">👥</span> Study Groups
      </Link>
      <Link to="/chat" className={`sidebar-item ${isActive('/chat')}`}>
        <span className="icon">💬</span> Messages
      </Link>
      <Link to="/tasks" className={`sidebar-item ${isActive('/tasks')}`}>
        <span className="icon">✅</span> Tasks & Goals
      </Link>
      <Link to="/analytics" className={`sidebar-item ${isActive('/analytics')}`}>
        <span className="icon">📈</span> Analytics
      </Link>
      <Link to="/matches" className={`sidebar-item ${isActive('/matches')}`}>
        <span className="icon">🤝</span> Matchmaking Hub
      </Link>
      <Link to="/profile" className={`sidebar-item ${isActive('/profile')}`}>
        <span className="icon">👤</span> Profile
      </Link>

      <div className="sidebar-section">Quick Actions</div>
      <div className="sidebar-item" onClick={onFindGroup || (() => navigate('/groups'))}>
        <span className="icon">🔍</span> Find Group
      </div>
      <div className="sidebar-item" onClick={onAIMatch || (() => {})}>
        <span className="icon">🤝</span> Study Partner Matches
      </div>

      <div style={{ flex: 1 }}></div>
      <div className="sidebar-item" style={{ marginTop: 'auto', color: 'var(--danger)' }} onClick={handleLogout}>
        <span className="icon">🚪</span> Logout
      </div>
    </aside>
  );
};

export default Sidebar;
