// ============================================
// Group Resources Tab (Shared Links & Files)
// ============================================

import React, { useState, useEffect } from 'react';
import { ResourcesAPI, Session } from '../api';
import { showToast } from '../utils';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

const getResourceIcon = (resource) => {
  if (resource.type === 'link') return '🔗';
  const mime = resource.file?.mimeType || '';
  if (mime.includes('pdf')) return '📄';
  if (mime.includes('image')) return '🖼️';
  return '📁';
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const GroupResourcesTab = ({ group }) => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [resourceType, setResourceType] = useState('link'); // 'link' | 'file'
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currentUser = Session.getUser();
  const currentUserId = currentUser?._id || currentUser?.id;
  const isGroupCreator = String(group?.createdBy?._id || group?.createdBy) === String(currentUserId);

  const loadResources = async () => {
    setLoading(true);
    const res = await ResourcesAPI.getByGroup(group._id);
    if (res.success) {
      setResources(res.resources || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadResources();
  }, [group._id]);

  const handleOpenAdd = () => {
    setTitle('');
    setUrl('');
    setFile(null);
    setTagsInput('');
    setResourceType('link');
    setError('');
    setShowAddModal(true);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setError('File size must not exceed 5 MB.');
        return;
      }
      setFile(selected);
      if (!title) setTitle(selected.name);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setSaving(true);
    setError('');

    let res;
    if (resourceType === 'file') {
      if (!file) {
        setError('Please select a file to upload.');
        setSaving(false);
        return;
      }
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('type', 'file');
      formData.append('tags', tagsInput);
      formData.append('file', file);

      res = await ResourcesAPI.create(group._id, formData);
    } else {
      if (!url.trim()) {
        setError('Please enter a valid link URL.');
        setSaving(false);
        return;
      }
      res = await ResourcesAPI.create(group._id, {
        title: title.trim(),
        type: 'link',
        url: url.trim(),
        tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      });
    }

    if (res.success) {
      showToast('Resource added successfully!', 'success');
      setShowAddModal(false);
      loadResources();
    } else {
      setError(res.message || 'Failed to add resource.');
    }
    setSaving(false);
  };

  const handleDelete = async (resourceId) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    const res = await ResourcesAPI.delete(resourceId);
    if (res.success) {
      showToast('Resource removed', 'info');
      setResources(prev => prev.filter(r => r._id !== resourceId));
    } else {
      showToast(res.message || 'Failed to delete resource', 'error');
    }
  };

  return (
    <div>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
          Shared Files &amp; Links ({resources.length})
        </h3>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
          ➕ Add Resource
        </button>
      </div>

      {/* Resources List */}
      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>⏳ Loading resources...</p>
      ) : resources.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📁</div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>No shared materials or files yet.</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
            Upload a PDF or Share a Link
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {resources.map(res => {
            const isUploader = String(res.addedBy?._id || res.addedBy) === String(currentUserId);
            const canManage = isUploader || isGroupCreator;
            const linkHref = res.type === 'file' ? `${API_BASE_URL}${res.file?.path}` : res.url;

            return (
              <div
                key={res._id}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ fontSize: '1.6rem', flexShrink: 0 }}>
                  {getResourceIcon(res)}
                </div>

                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)' }}>
                    <a
                      href={linkHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'inherit', textDecoration: 'none' }}
                      className="resource-link"
                    >
                      {res.title} ↗
                    </a>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {res.type === 'file' ? formatFileSize(res.file?.size) : 'External Web Link'} ·
                    Added by {res.addedBy?.name || 'Member'} · {new Date(res.createdAt).toLocaleDateString()}
                  </div>

                  {res.tags && res.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {res.tags.map(t => (
                        <span key={t} className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <a
                    href={linkHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                  >
                    {res.type === 'file' ? '⬇️ Download' : '🔗 Open'}
                  </a>

                  {canManage && (
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '1rem', padding: '4px' }}
                      title="Delete resource"
                      onClick={() => handleDelete(res._id)}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Resource Modal */}
      {showAddModal && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}>
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">➕ Share Resource</h3>
              <button type="button" className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}

            {/* Type Switcher */}
            <div className="tabs" style={{ marginBottom: '1rem' }}>
              <button
                type="button"
                className={`tab-btn ${resourceType === 'link' ? 'active' : ''}`}
                onClick={() => setResourceType('link')}
              >
                🔗 Web Link
              </button>
              <button
                type="button"
                className={`tab-btn ${resourceType === 'file' ? 'active' : ''}`}
                onClick={() => setResourceType('file')}
              >
                📁 Upload File (PDF, Image, Text)
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Resource Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Midterm Study Guide"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {resourceType === 'link' ? (
                <div className="form-group">
                  <label className="form-label">URL</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Select File (Max 5 MB: PDF, PNG, JPG, TXT)</label>
                  <input
                    type="file"
                    className="form-input"
                    accept=".pdf,.png,.jpg,.jpeg,.txt"
                    onChange={handleFileChange}
                    required
                  />
                  {file && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Selected: {file.name} ({formatFileSize(file.size)})
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Tags (comma separated)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. syllabus, slides, homework"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Uploading...' : '💾 Add Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupResourcesTab;
