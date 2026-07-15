import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { TasksAPI, Session } from '../api';

const priorityBadge = { high: 'badge-danger', medium: 'badge-warning', low: 'badge-primary' };

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', subject: '', priority: 'medium', deadline: '' });
  const [activeTab, setActiveTab] = useState('all');
  const [error, setError] = useState('');

  // Fetch tasks from MongoDB on load
  useEffect(() => {
    if (!Session.isLoggedIn()) { window.location.href = '/login'; return; }
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    const res = await TasksAPI.getAll();
    if (res.success) {
      setTasks(res.tasks);
    }
    setLoading(false);
  };

  // Toggle task done/pending in MongoDB
  const toggleDone = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const res = await TasksAPI.update(task._id, { status: newStatus });
    if (res.success) {
      setTasks(prev => prev.map(t => t._id === task._id ? res.task : t));
    }
  };

  // Delete task from MongoDB
  const deleteTask = async (id) => {
    const res = await TasksAPI.delete(id);
    if (res.success) {
      setTasks(prev => prev.filter(t => t._id !== id));
    }
  };

  // Add new task to MongoDB
  const addTask = async () => {
    if (!newTask.title.trim()) return;
    setError('');
    const res = await TasksAPI.create({
      title: newTask.title,
      subject: newTask.subject,
      priority: newTask.priority,
      deadline: newTask.deadline || undefined
    });
    if (res.success) {
      setTasks(prev => [...prev, res.task]);
      setNewTask({ title: '', subject: '', priority: 'medium', deadline: '' });
      setShowModal(false);
    } else {
      setError(res.message || 'Failed to add task.');
    }
  };

  const filtered = tasks.filter(t => {
    if (activeTab === 'pending') return t.status !== 'completed';
    if (activeTab === 'done') return t.status === 'completed';
    return true;
  });

  const completed = tasks.filter(t => t.status === 'completed').length;
  const total = tasks.length;

  return (
    <div className="page-wrapper">
      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <h1 className="section-title" style={{ fontSize: '1.8rem' }}>Tasks &amp; <span>Goals</span></h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
                {completed} of {total} tasks completed
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Add Task</button>
          </div>

          {/* Progress */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="progress-item-label">
              <span style={{ fontWeight: 600 }}>Overall Progress</span>
              <span className="progress-pct">{total > 0 ? Math.round((completed / total) * 100) : 0}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${total > 0 ? Math.round((completed / total) * 100) : 0}%` }}></div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            {['all', 'pending', 'done'].map(tab => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Task List */}
          <div className="card">
            {loading ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>⏳ Loading tasks...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filtered.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                    No tasks here yet. Click ➕ Add Task to get started!
                  </p>
                )}
                {filtered.map(t => (
                  <div key={t._id} className="task-item">
                    <input
                      type="checkbox"
                      className="task-checkbox"
                      checked={t.status === 'completed'}
                      onChange={() => toggleDone(t)}
                    />
                    <div style={{ flex: 1 }}>
                      <div className={`task-text ${t.status === 'completed' ? 'done' : ''}`}>{t.title}</div>
                      <div className="task-subject">
                        {t.subject}{t.deadline ? ` · Due ${new Date(t.deadline).toLocaleDateString()}` : ''}
                      </div>
                    </div>
                    <span className={`badge ${priorityBadge[t.priority] || 'badge-primary'}`}>{t.priority}</span>
                    <button
                      onClick={() => deleteTask(t._id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '1rem', marginLeft: '8px' }}
                      title="Delete task"
                    >🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add Task Modal */}
      {showModal && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">➕ Add New Task</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}
            <div className="form-group">
              <label className="form-label">Task Title</label>
              <input
                type="text" className="form-input" placeholder="e.g. Complete chapter 5 exercises"
                value={newTask.title}
                onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                type="text" className="form-input" placeholder="e.g. Mathematics"
                value={newTask.subject}
                onChange={e => setNewTask(p => ({ ...p, subject: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={newTask.priority} onChange={e => setNewTask(p => ({ ...p, priority: e.target.value }))}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Deadline (optional)</label>
              <input
                type="date" className="form-input"
                value={newTask.deadline}
                onChange={e => setNewTask(p => ({ ...p, deadline: e.target.value }))}
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={addTask}>
              💾 Save Task to Database
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
