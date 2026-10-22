// ============================================
// Group Notes Tab (Shared Markdown Notes)
// ============================================

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { NotesAPI, Session } from '../api';
import { showToast } from '../utils';

const GroupNotesTab = ({ group }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [allTags, setAllTags] = useState([]);

  // Editor modal state
  const [showEditor, setShowEditor] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState(group?.subject || '');
  const [tagsInput, setTagsInput] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currentUser = Session.getUser();
  const currentUserId = currentUser?._id || currentUser?.id;
  const isGroupCreator = String(group?.createdBy?._id || group?.createdBy) === String(currentUserId);

  const loadNotes = async () => {
    setLoading(true);
    const res = await NotesAPI.getByGroup(group._id, search, selectedTag);
    if (res.success) {
      setNotes(res.notes || []);
      // Collect unique tags
      const tagsSet = new Set();
      (res.notes || []).forEach(n => (n.tags || []).forEach(t => tagsSet.add(t)));
      setAllTags([...tagsSet]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNotes();
  }, [group._id, search, selectedTag]);

  const handleOpenCreate = () => {
    setEditingNoteId(null);
    setTitle('');
    setContent('# Study Notes\n\n- Key concepts:\n- Important formulas:\n- Questions to review:');
    setSubject(group?.subject || '');
    setTagsInput('');
    setPreviewMode(false);
    setError('');
    setShowEditor(true);
  };

  const handleOpenEdit = (note) => {
    setEditingNoteId(note._id);
    setTitle(note.title);
    setContent(note.content);
    setSubject(note.subject || group?.subject || '');
    setTagsInput((note.tags || []).join(', '));
    setPreviewMode(false);
    setError('');
    setShowEditor(true);
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      title: title.trim(),
      content,
      subject: subject.trim(),
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    };

    let res;
    if (editingNoteId) {
      res = await NotesAPI.update(editingNoteId, payload);
    } else {
      res = await NotesAPI.create(group._id, payload);
    }

    if (res.success) {
      showToast(editingNoteId ? 'Note updated!' : 'Note created!', 'success');
      setShowEditor(false);
      loadNotes();
    } else {
      setError(res.message || 'Failed to save note.');
    }
    setSaving(false);
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    const res = await NotesAPI.delete(noteId);
    if (res.success) {
      showToast('Note deleted', 'info');
      setNotes(prev => prev.filter(n => n._id !== noteId));
    } else {
      showToast(res.message || 'Failed to delete note', 'error');
    }
  };

  const handleTogglePin = async (noteId) => {
    const res = await NotesAPI.togglePin(noteId);
    if (res.success) {
      showToast(res.pinned ? '📌 Note pinned' : 'Note unpinned', 'success');
      loadNotes();
    } else {
      showToast(res.message || 'Failed to pin note', 'error');
    }
  };

  return (
    <div>
      {/* Controls Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '400px' }}>
          <div className="input-wrapper" style={{ flex: 1 }}>
            <span className="input-icon">🔍</span>
            <input
              type="text"
              className="form-input"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenCreate}>
          ➕ New Markdown Note
        </button>
      </div>

      {/* Tag filter chips */}
      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <span
            className={`chip ${!selectedTag ? 'selected' : ''}`}
            onClick={() => setSelectedTag('')}
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            All Tags
          </span>
          {allTags.map(t => (
            <span
              key={t}
              className={`chip ${selectedTag === t ? 'selected' : ''}`}
              onClick={() => setSelectedTag(t === selectedTag ? '' : t)}
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Notes Grid */}
      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>⏳ Loading notes...</p>
      ) : notes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📝</div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>No notes in this group yet.</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenCreate}>
            Create the First Note
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {notes.map(note => {
            const isAuthor = String(note.author?._id || note.author) === String(currentUserId);
            const canManage = isAuthor || isGroupCreator;

            return (
              <div
                key={note._id}
                className="card"
                style={{
                  border: note.pinned ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: note.pinned ? 'rgba(6,182,212,0.06)' : 'var(--card)',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px', gap: '8px' }}>
                  <div>
                    {note.pinned && (
                      <span className="badge badge-primary" style={{ fontSize: '0.68rem', marginBottom: '4px', display: 'inline-block' }}>
                        📌 PINNED
                      </span>
                    )}
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                      {note.title}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      By {note.author?.name || 'Member'} · {new Date(note.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    {isGroupCreator && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 6px', fontSize: '0.8rem' }}
                        title={note.pinned ? 'Unpin' : 'Pin to top'}
                        onClick={() => handleTogglePin(note._id)}
                      >
                        📌
                      </button>
                    )}
                    {canManage && (
                      <>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 6px', fontSize: '0.8rem' }}
                          title="Edit note"
                          onClick={() => handleOpenEdit(note)}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 6px', fontSize: '0.8rem', color: 'var(--danger)' }}
                          title="Delete note"
                          onClick={() => handleDelete(note._id)}
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Markdown Content Preview */}
                <div
                  className="markdown-body"
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                    maxHeight: '180px',
                    overflowY: 'auto',
                    margin: '8px 0',
                    padding: '8px',
                    background: 'var(--bg2)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <ReactMarkdown>{note.content}</ReactMarkdown>
                </div>

                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '8px' }}>
                    {note.tags.map(t => (
                      <span key={t} className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Markdown Note Editor Modal */}
      {showEditor && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setShowEditor(false); }}>
          <div className="modal" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingNoteId ? '✏️ Edit Study Note' : '📝 Create Markdown Note'}
              </h3>
              <button type="button" className="modal-close" onClick={() => setShowEditor(false)}>✕</button>
            </div>

            {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}

            <form onSubmit={handleSaveNote}>
              <div className="form-group">
                <label className="form-label">Note Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Algorithms Cheat Sheet"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input
                    type="text"
                    className="form-input"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tags (comma separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. dsa, trees, exam"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                  />
                </div>
              </div>

              {/* Editor / Preview Tabs */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>Content (Markdown)</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${!previewMode ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                    onClick={() => setPreviewMode(false)}
                  >
                    ✏️ Write
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${previewMode ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                    onClick={() => setPreviewMode(true)}
                  >
                    👁️ Preview
                  </button>
                </div>
              </div>

              {!previewMode ? (
                <div className="form-group">
                  <textarea
                    className="form-input"
                    rows={10}
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem', resize: 'vertical' }}
                    placeholder="Write markdown here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div
                  className="markdown-body"
                  style={{
                    minHeight: '220px',
                    padding: '14px',
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1rem',
                    fontSize: '0.875rem'
                  }}
                >
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowEditor(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Saving...' : '💾 Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupNotesTab;
