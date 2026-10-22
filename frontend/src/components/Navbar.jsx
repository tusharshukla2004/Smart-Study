import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { logout, setUser as setReduxUser } from '../store/slices/authSlice';
import { toggleTheme } from '../store/slices/themeSlice';
import NotificationBell from './NotificationBell';
import XpLevelBar from './gamification/XpLevelBar';
import CelebrationModal from './gamification/CelebrationModal';
import { useSocket } from '../hooks/useSocket';
import { GamificationAPI } from '../api';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [celebration, setCelebration] = useState({ open: false, levelUp: false, newLevel: null, newBadges: [], xpGained: 0 });
  const [gamification, setGamification] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { socket } = useSocket();

  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const themeMode = useAppSelector((state) => state.theme.mode);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Fetch gamification progress
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchGamification = async () => {
      const res = await GamificationAPI.getMe();
      if (res.success) {
        setGamification(res);
      }
    };
    fetchGamification();
  }, [isAuthenticated, user?.xp]);

  // Real-time socket listener for level-ups and new badges
  useEffect(() => {
    if (!socket) return;

    const handleGamificationUpdate = (data) => {
      if (data.levelUp || (data.newBadges && data.newBadges.length > 0)) {
        setCelebration({
          open: true,
          levelUp: data.levelUp,
          newLevel: data.level,
          newBadges: data.newBadges || [],
          xpGained: data.xpGained || 0
        });
      }

      // Update Redux state with new XP and level
      if (data.newTotalXp !== undefined) {
        setGamification(prev => prev ? {
          ...prev,
          xp: data.newTotalXp,
          level: data.level
        } : null);
      }
    };

    socket.on('gamification:update', handleGamificationUpdate);
    return () => {
      socket.off('gamification:update', handleGamificationUpdate);
    };
  }, [socket]);

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <>
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`} id="navbar">
        <Link to="/" className="nav-brand">📚 Smart Study</Link>
        <div className="nav-links">
          <Link to="/" className={isActive('/')}>Home</Link>
          {isAuthenticated && (
            <>
              <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
              <Link to="/groups" className={isActive('/groups')}>Groups</Link>
              <Link to="/chat" className={isActive('/chat')}>Chat</Link>
              <Link to="/tasks" className={isActive('/tasks')}>Tasks</Link>
              <Link to="/analytics" className={isActive('/analytics')}>Analytics</Link>
            </>
          )}
        </div>
        <div className="nav-actions">
          <button
            className="theme-toggle"
            aria-label="Toggle theme"
            title={`Current theme: ${themeMode}`}
            onClick={handleToggleTheme}
          ></button>

          {isAuthenticated ? (
            <>
              {/* XP Level Pill */}
              <XpLevelBar
                xp={gamification?.xp || user?.xp || 0}
                level={gamification?.level || user?.level || 1}
                levelProgress={gamification?.levelProgress}
                compact={true}
              />

              <NotificationBell />
              <Link to="/profile" className="btn btn-ghost btn-sm">
                {user?.avatar ? `${user.avatar} ` : ''}Profile
              </Link>
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
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" onClick={toggleMenu}>📊 Dashboard</Link>
            <Link to="/groups" onClick={toggleMenu}>👥 Groups</Link>
            <Link to="/chat" onClick={toggleMenu}>💬 Chat</Link>
            <Link to="/tasks" onClick={toggleMenu}>✅ Tasks</Link>
            <Link to="/analytics" onClick={toggleMenu}>📈 Analytics</Link>
            <Link to="/notifications" onClick={toggleMenu}>🔔 Notifications</Link>
            <Link to="/profile" onClick={toggleMenu}>👤 Profile</Link>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { toggleMenu(); handleLogout(); }}
            >
              Logout
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <Link to="/login" className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={toggleMenu}>Login</Link>
            <Link to="/signup" className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={toggleMenu}>Sign Up</Link>
          </div>
        )}
      </div>

      {/* Level Up & Badge Celebration Modal */}
      <CelebrationModal
        isOpen={celebration.open}
        onClose={() => setCelebration(prev => ({ ...prev, open: false }))}
        levelUp={celebration.levelUp}
        newLevel={celebration.newLevel}
        newBadges={celebration.newBadges}
        xpGained={celebration.xpGained}
      />
    </>
  );
};

export default Navbar;
