// ============================================
// Notifications Page
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { NotificationAPI } from '../api';
import { showToast } from '../utils';

const TYPE_ICONS = {
  group_join: '👥',
  new_message: '💬',
  session_scheduled: '📅',
  session_starting: '⏳',
  session_cancelled: '❌',
  task_deadline: '⚠️',
  system: 'ℹ️'
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUnread, setFilterUnread] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNotifications = async (isUnread = filterUnread, pageNum = page) => {
    setLoading(true);
    const res = await NotificationAPI.getAll(isUnread, pageNum);
    if (res.success) {
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
      setTotalPages(res.totalPages || 1);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications(filterUnread, page);
  }, [filterUnread, page]);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    const res = await NotificationAPI.markAsRead(id);
    if (res.success) {
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      showToast('Marked as read', 'success');
    }
  };

  const handleMarkAllRead = async () => {
    const res = await NotificationAPI.markAllAsRead();
    if (res.success) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      showToast('All notifications marked as read', 'success');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    const res = await NotificationAPI.delete(id);
    if (res.success) {
      setNotifications(prev => prev.filter(n => n._id !== id));
      showToast('Notification deleted', 'info');
    }
  };

  const handleNavigate = (notif) => {
    if (!notif.read) {
      NotificationAPI.markAsRead(notif._id).catch(() => {});
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 className="section-title" style={{ fontSize: '1.8rem' }}>Notifications</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
                Stay updated with study sessions, group activity, and tasks
              </p>
            </div>
            {unreadCount > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={handleMarkAllRead}>
                ✓ Mark All as Read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="tabs" style={{ marginBottom: '1.5rem' }}>
            <button
              className={`tab-btn ${!filterUnread ? 'active' : ''}`}
              onClick={() => { setFilterUnread(false); setPage(1); }}
            >
              All Notifications
            </button>
            <button
              className={`tab-btn ${filterUnread ? 'active' : ''}`}
              onClick={() => { setFilterUnread(true); setPage(1); }}
            >
              Unread Only ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            {loading ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>⏳ Loading notifications...</p>
            ) : notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>All caught up!</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {filterUnread ? 'You have no unread notifications.' : 'You have no notifications yet.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {notifications.map(notif => (
                  <div
                    key={notif._id}
                    onClick={() => handleNavigate(notif)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px 20px',
                      borderBottom: '1px solid var(--border)',
                      background: notif.read ? 'transparent' : 'rgba(6,182,212,0.06)',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    className="notif-page-item"
                  >
                    <div style={{
                      fontSize: '1.6rem',
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'var(--bg3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {TYPE_ICONS[notif.type] || '📌'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: notif.read ? 600 : 700, fontSize: '0.95rem' }}>{notif.title}</span>
                        {!notif.read && (
                          <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>New</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {notif.message}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                        {new Date(notif.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {!notif.read && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Mark as read"
                          onClick={(e) => handleMarkAsRead(notif._id, e)}
                        >
                          ✓ Read
                        </button>
                      )}
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '1rem', padding: '6px' }}
                        title="Delete notification"
                        onClick={(e) => handleDelete(notif._id, e)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '1.5rem' }}>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                ← Previous
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next →
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Notifications;
