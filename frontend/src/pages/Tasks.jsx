import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';

const INITIAL_TASKS = [
  { id: 1, text: 'Complete Chapter 7 exercises', subject: 'Mathematics', due: '2026-04-01', priority: 'high', done: false },
  { id: 2, text: 'Review lecture notes on sorting algorithms', subject: 'Algorithms', due: '2026-03-30', priority: 'medium', done: true },
  { id: 3, text: 'Watch ML tutorial series (episodes 1-5)', subject: 'Machine Learning', due: '2026-04-03', priority: 'low', done: false },
  { id: 4, text: 'Prepare for physics quiz on thermodynamics', subject: 'Physics', due: '2026-03-31', priority: 'high', done: false },
  { id: 5, text: 'Submit project proposal', subject: 'Research', due: '2026-04-05', priority: 'medium', done: true },
];

const priorityBadge = { high: 'badge-danger', medium: 'badge-warning', low: 'badge-primary' };

const Tasks = () => {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({ text: '', subject: '', priority: 'medium' });
  const [activeTab, setActiveTab] = useState('all');

  const toggleDone = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const addTask = () => {
    if (!newTask.text.trim()) return;
    setTasks(prev => [...prev, { ...newTask, id: Date.now(), done: false, due: '' }]);
    setNewTask({ text: '', subject: '', priority: 'medium' });
    setShowModal(false);
  };

  const filtered = tasks.filter(t => {
    if (activeTab === 'pending') return !t.done;
    if (activeTab === 'done') return t.done;
    return true;
  });

  const completed = tasks.filter(t => t.done).length;

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
                {completed} of {tasks.length} tasks completed
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>➕ Add Task</button>
          </div>

          {/* Progress */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="progress-item-label">
              <span style={{ fontWeight: 600 }}>Overall Progress</span>
              <span className="progress-pct">{Math.round((completed / tasks.length) * 100)}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.round((completed / tasks.length) * 100)}%` }}></div>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filtered.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>No tasks here yet.</p>
              )}
              {filtered.map(t => (
                <div key={t.id} className="task-item">
                  <input
                    type="checkbox"
                    className="task-checkbox"
                    checked={t.done}
                    onChange={() => toggleDone(t.id)}
                  />
                  <div style={{ flex: 1 }}>
                    <div className={`task-text ${t.done ? 'done' : ''}`}>{t.text}</div>
                    <div className="task-subject">{t.subject}{t.due ? ` · Due ${t.due}` : ''}</div>
                  </div>
                  <span className={`badge ${priorityBadge[t.priority]}`}>{t.priority}</span>
                </div>
              ))}
            </div>
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
            <div className="form-group">
              <label className="form-label">Task</label>
              <input
                type="text" className="form-input" placeholder="e.g. Complete chapter 5 exercises"
                value={newTask.text}
                onChange={e => setNewTask(p => ({ ...p, text: e.target.value }))}
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
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={addTask}>
              Add Task
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
