// ============================================
// Notification Bell Component
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { NotificationAPI } from '../api';
import { useSocket } from '../hooks/useSocket';

const TYPE_ICONS = {
  group_join: '👥',
  new_message: '💬',
  session_scheduled: '📅',
  session_starting: '⏳',
  session_cancelled: '❌',
  task_deadline: '⚠️',
  system: 'ℹ️'
};

const formatTimeAgo = (dateStr) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - d) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch initial unread count
  useEffect(() => {
    let active = true;
    const fetchCount = async () => {
      const res = await NotificationAPI.getUnreadCount();
      if (active && res.success) {
        setUnreadCount(res.unreadCount || 0);
      }
    };
    fetchCount();
    return () => { active = false; };
  }, []);

  // Real-time socket listener for new notifications
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      setUnreadCount(prev => prev + 1);
      setNotifications(prev => [notification, ...prev.slice(0, 9)]);
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load preview list when dropdown opens
  const toggleDropdown = async () => {
    if (!isOpen) {
      setLoading(true);
      const res = await NotificationAPI.getAll(false, 1);
      if (res.success) {
        setNotifications((res.notifications || []).slice(0, 8));
        setUnreadCount(res.unreadCount || 0);
      }
      setLoading(false);
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    await NotificationAPI.markAllAsRead();
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleItemClick = async (notif) => {
    if (!notif.read) {
      await NotificationAPI.markAsRead(notif._id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="notification-bell-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className="notification-bell-btn"
        onClick={toggleDropdown}
        aria-label="View notifications"
        title="Notifications"
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown animate-fadeUp">
          <div className="notification-dropdown-header">
            <span className="header-title">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="mark-read-btn"
                onClick={handleMarkAllRead}
              >
                ✓ Mark all read
              </button>
            )}
          </div>

          <div className="notification-dropdown-list">
            {loading ? (
              <p className="notification-empty">Loading notifications...</p>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '6px' }}>🎉</span>
                You're all caught up!
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`notification-item ${!notif.read ? 'unread' : ''}`}
                  onClick={() => handleItemClick(notif)}
                >
                  <div className="notif-icon">
                    {TYPE_ICONS[notif.type] || '📌'}
                  </div>
                  <div className="notif-body">
                    <div className="notif-title">{notif.title}</div>
                    <div className="notif-message">{notif.message}</div>
                    <div className="notif-time">{formatTimeAgo(notif.createdAt)}</div>
                  </div>
                  {!notif.read && <span className="unread-dot"></span>}
                </div>
              ))
            )}
          </div>

          <div className="notification-dropdown-footer">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="view-all-link"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
