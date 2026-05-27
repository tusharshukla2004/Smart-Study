import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';

const SUBJECTS = [
  '📐 Mathematics', '⚛️ Physics', '🧪 Chemistry', '🧬 Biology',
  '💻 Computer Science', '⚙️ Algorithms', '🤖 Machine Learning',
  '📈 Economics', '🌐 Web Development'
];

const Profile = () => {
  const [user, setUser] = useState({
    name: 'Alex Jordan',
    email: 'alex@university.edu',
    university: 'MIT',
    major: 'Computer Science',
    level: 'Undergraduate (Year 2)',
    bio: 'Passionate about AI & machine learning. Looking for study partners for advanced algorithms.',
    subjects: ['Mathematics', 'Computer Science', 'Machine Learning'],
    studyHours: 24,
    groupsJoined: 6,
    tasksCompleted: 18,
    streak: 12,
    avatar: 'AJ',
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...user });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem('ss_user');
    if (cached) {
      const parsed = JSON.parse(cached);
      setUser(prev => ({ ...prev, ...parsed }));
      setDraft(prev => ({ ...prev, ...parsed }));
    }
  }, []);

  const handleSave = () => {
    setUser(draft);
    localStorage.setItem('ss_user', JSON.stringify(draft));
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateDraft = e => setDraft(p => ({ ...p, [e.target.name]: e.target.value }));

  const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'AJ';

  return (
    <div className="page-wrapper">
      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          {/* Profile Header */}
          <div className="profile-header-card">
            <div className="avatar avatar-xl">{initials}</div>
            <div style={{ flex: 1 }}>
              <div className="profile-name">{user.name}</div>
              <div className="profile-meta">{user.university} · {user.major}</div>
              <div className="profile-meta" style={{ marginTop: '2px' }}>{user.level}</div>
              <div className="profile-stats">
                <div>
                  <div className="profile-stat-value">{user.studyHours}h</div>
                  <div className="profile-stat-label">Study Hours</div>
                </div>
                <div>
                  <div className="profile-stat-value">{user.groupsJoined}</div>
                  <div className="profile-stat-label">Groups</div>
                </div>
                <div>
                  <div className="profile-stat-value">{user.tasksCompleted}</div>
                  <div className="profile-stat-label">Tasks Done</div>
                </div>
                <div>
                  <div className="profile-stat-value">🔥 {user.streak}</div>
                  <div className="profile-stat-label">Day Streak</div>
                </div>
              </div>
            </div>
            <button
              className={`btn ${editing ? 'btn-ghost' : 'btn-primary'}`}
              onClick={() => { setEditing(!editing); setDraft({ ...user }); }}
            >
              {editing ? '✕ Cancel' : '✏️ Edit Profile'}
            </button>
          </div>

          {saved && (
            <div className="toast success" style={{ position: 'static', marginBottom: '1rem', animationName: 'none' }}>
              <strong>✅ Profile saved!</strong>
            </div>
          )}

          {/* Profile Form */}
          <div className="card">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text" name="name" className="form-input"
                  value={editing ? draft.name : user.name}
                  onChange={updateDraft} readOnly={!editing}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email" name="email" className="form-input"
                  value={editing ? draft.email : user.email}
                  onChange={updateDraft} readOnly={!editing}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">University / School</label>
                <div className="input-wrapper">
                  <span className="input-icon">🏫</span>
                  <input
                    type="text" name="university" className="form-input"
                    value={editing ? draft.university : user.university}
                    onChange={updateDraft} readOnly={!editing}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Major / Field of Study</label>
                <div className="input-wrapper">
                  <span className="input-icon">📖</span>
                  <input
                    type="text" name="major" className="form-input"
                    value={editing ? draft.major : user.major}
                    onChange={updateDraft} readOnly={!editing}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea
                name="bio" className="form-textarea" rows="4"
                value={editing ? draft.bio : user.bio}
                onChange={updateDraft} readOnly={!editing}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Subjects</label>
              <div className="subject-chips">
                {SUBJECTS.map((sub, i) => {
                  const plain = sub.split(' ').slice(1).join(' ');
                  const selected = (editing ? draft.subjects : user.subjects)?.includes(plain);
                  return (
                    <div
                      key={i}
                      className={`chip ${selected ? 'selected' : ''}`}
                      onClick={() => {
                        if (!editing) return;
                        setDraft(p => ({
                          ...p,
                          subjects: selected
                            ? p.subjects.filter(s => s !== plain)
                            : [...(p.subjects || []), plain]
                        }));
                      }}
                    >
                      {sub}
                    </div>
                  );
                })}
              </div>
            </div>

            {editing && (
              <button className="btn btn-primary" onClick={handleSave}>
                💾 Save Changes
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;
