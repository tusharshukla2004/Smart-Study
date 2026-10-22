import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { GroupsAPI, TasksAPI, UserAPI, GamificationAPI, Session } from '../api';
import SubjectLevelPicker from '../components/matchmaking/SubjectLevelPicker';
import AvailabilityGrid from '../components/matchmaking/AvailabilityGrid';
import LearningGoalPicker from '../components/matchmaking/LearningGoalPicker';
import StudyStylePicker from '../components/matchmaking/StudyStylePicker';
import ProfileCompletenessMeter from '../components/matchmaking/ProfileCompletenessMeter';
import ReputationCard from '../components/ratings/ReputationCard';
import BadgesGrid from '../components/gamification/BadgesGrid';
import XpLevelBar from '../components/gamification/XpLevelBar';
import { showToast } from '../utils';

const SUBJECTS = [
  '📐 Mathematics', '⚛️ Physics', '🧪 Chemistry', '🧬 Biology',
  '💻 Computer Science', '⚙️ Algorithms', '🤖 Machine Learning',
  '📈 Economics', '🌐 Web Development'
];

const Profile = () => {
  const [user, setUser] = useState({
    name: '', email: '', university: '', major: '',
    level: '', bio: '', subjects: [],
    subjectProfiles: [], availabilitySlots: [], timezone: 'Asia/Kolkata',
    learningGoal: [], studyStyle: 'mixed',
    groupsJoined: 0, tasksCompleted: 0, avatar: '',
    streak: 0, longestStreak: 0, xp: 0, leaderboardOptIn: true
  });
  const [gamification, setGamification] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...user });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [optInLoading, setOptInLoading] = useState(false);

  // Fetch real profile from MongoDB on load
  useEffect(() => {
    if (!Session.isLoggedIn()) { window.location.href = '/login'; return; }
    const fetchProfile = async () => {
      const [res, groupsRes, tasksRes, gamificationRes] = await Promise.all([
        UserAPI.getProfile(),
        GroupsAPI.getAll(),
        TasksAPI.getAll(),
        GamificationAPI?.getMe ? GamificationAPI.getMe() : Promise.resolve({ success: false })
      ]);
      if (res.success) {
        const currentUserId = Session.getUser()?._id || Session.getUser()?.id;
        const groupsJoined = groupsRes.success
          ? (groupsRes.groups || []).filter(group =>
            (group.members || []).some(member => String(member._id || member) === String(currentUserId))
          ).length
          : 0;
        const tasksCompleted = tasksRes.success ? tasksRes.stats.completed : 0;

        let subjectProfiles = res.user.subjectProfiles || [];
        if (!subjectProfiles.length && res.user.subjects?.length) {
          subjectProfiles = res.user.subjects.map(s => ({
            name: s.toLowerCase(),
            displayName: s,
            level: 'intermediate',
            wantsToLearn: true,
            canTeach: false
          }));
        }

        const profile = {
          ...res.user,
          subjectProfiles,
          groupsJoined,
          tasksCompleted
        };
        setUser(profile);
        setDraft(profile);
        Session.updateUser(profile);
      } else {
        setError(res.message || 'Could not load your profile.');
        const cached = Session.getUser();
        if (cached) { setUser(prev => ({ ...prev, ...cached })); setDraft(prev => ({ ...prev, ...cached })); }
      }

      if (gamificationRes?.success) {
        setGamification(gamificationRes);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  // Save profile to MongoDB
  const handleSave = async () => {
    setError('');
    const editableFields = [
      'name', 'university', 'major', 'level', 'bio', 'subjects',
      'availability', 'studyPreferences', 'avatar',
      'subjectProfiles', 'availabilitySlots', 'timezone', 'learningGoal', 'studyStyle'
    ];
    const profileUpdates = Object.fromEntries(
      editableFields.filter(f => draft[f] !== undefined).map(field => [field, draft[field]])
    );

    if (draft.subjectProfiles?.length) {
      profileUpdates.subjects = draft.subjectProfiles.map(p => p.displayName || p.name);
    }

    const res = await UserAPI.updateProfile(profileUpdates);
    if (res.success) {
      const profile = {
        ...res.user,
        groupsJoined: user.groupsJoined,
        tasksCompleted: user.tasksCompleted
      };
      setUser(profile);
      setDraft(profile);
      Session.updateUser(profile);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      showToast('Profile updated!', 'success');
    } else {
      setError(res.message || 'Could not save your profile.');
    }
  };

  const handleToggleOptIn = async (e) => {
    const checked = e.target.checked;
    setOptInLoading(true);
    const res = await GamificationAPI.updateOptIn(checked);
    if (res.success) {
      setUser(prev => ({ ...prev, leaderboardOptIn: checked }));
      setDraft(prev => ({ ...prev, leaderboardOptIn: checked }));
      showToast(checked ? 'Visible on public leaderboards.' : 'Hidden from public leaderboards.', 'info');
    } else {
      showToast(res.message || 'Failed to update setting', 'error');
    }
    setOptInLoading(false);
  };

  const updateDraft = e => setDraft(p => ({ ...p, [e.target.name]: e.target.value }));

  const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'AJ';

  return (
    <div className="page-wrapper">
      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          {/* Profile Header */}
          <div className="profile-header-card" style={{ marginBottom: '20px' }}>
            <div className="avatar avatar-xl">{initials}</div>
            <div style={{ flex: 1 }}>
              <div className="profile-name">{user.name}</div>
              <div className="profile-meta">{user.university || 'University'} · {user.major || 'Student'}</div>
              <div className="profile-meta" style={{ marginTop: '2px' }}>{user.level || 'Undergraduate'}</div>
              <div className="profile-stats">
                <div>
                  <div className="profile-stat-value">{user.groupsJoined}</div>
                  <div className="profile-stat-label">Groups</div>
                </div>
                <div>
                  <div className="profile-stat-value">{user.tasksCompleted}</div>
                  <div className="profile-stat-label">Tasks Done</div>
                </div>
                <div>
                  <div className="profile-stat-value">🔥 {user.streak || 0}d</div>
                  <div className="profile-stat-label">Streak (Best: {user.longestStreak || user.streak || 0}d)</div>
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
          {error && <div role="alert" className="toast error" style={{ position: 'static', marginBottom: '1rem', animationName: 'none' }}>{error}</div>}

          {/* Gamification Level Progress */}
          {gamification && (
            <div style={{ marginBottom: '20px' }}>
              <XpLevelBar
                xp={gamification.xp || user.xp || 0}
                level={gamification.level || 1}
                levelProgress={gamification.levelProgress}
                compact={false}
              />
            </div>
          )}

          {/* Profile Details & Matchmaking Form */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.05rem', fontWeight: 700 }}>
              {editing ? 'Edit Profile & Match Preferences' : 'Academic & Personal Details'}
            </h3>

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
                  readOnly
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
                name="bio" className="form-textarea" rows="3"
                value={editing ? draft.bio : user.bio}
                onChange={updateDraft} readOnly={!editing}
                placeholder="Tell potential study partners about yourself, study habits, goals..."
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Editing: Subject Proficiencies, Availability, Goals, Style */}
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Subject Proficiencies &amp; Mentorship</label>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Define what you want to learn or mentor. This powers our Matchmaking v2 engine.
                  </div>
                  <SubjectLevelPicker
                    subjectProfiles={draft.subjectProfiles || []}
                    onChange={(sp) => setDraft(p => ({ ...p, subjectProfiles: sp }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Weekly Study Availability &amp; Timezone</label>
                  <AvailabilityGrid
                    availabilitySlots={draft.availabilitySlots || []}
                    availability={draft.availability || []}
                    timezone={draft.timezone || 'Asia/Kolkata'}
                    onSlotsChange={(slots) => setDraft(p => ({ ...p, availabilitySlots: slots }))}
                    onAvailabilityChange={(av) => setDraft(p => ({ ...p, availability: av }))}
                    onTimezoneChange={(tz) => setDraft(p => ({ ...p, timezone: tz }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Learning Goals (Max 2)</label>
                  <LearningGoalPicker
                    selectedGoals={draft.learningGoal || []}
                    onChange={(goals) => setDraft(p => ({ ...p, learningGoal: goals }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Preferred Study Style</label>
                  <StudyStylePicker
                    selectedStyle={draft.studyStyle || 'mixed'}
                    onChange={(st) => setDraft(p => ({ ...p, studyStyle: st }))}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                  <button className="btn btn-ghost" onClick={() => { setDraft({ ...user }); setEditing(false); }}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSave}>💾 Save Changes</button>
                </div>
              </div>
            ) : (
              /* View Mode: Matchmaking & Collaboration Preferences */
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                    🎯 Study Partner Matching Preferences
                  </h4>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setEditing(true)}
                    style={{ fontSize: '0.8rem' }}
                  >
                    ✏️ Edit
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  <ProfileCompletenessMeter
                    completeness={(() => {
                      let c = 0;
                      if (user.subjectProfiles?.length || user.subjects?.length) c += 35;
                      if (user.availabilitySlots?.length) c += 25;
                      else if (user.availability?.length) c += 15;
                      if (user.learningGoal?.length) c += 15;
                      if (user.studyStyle) c += 10;
                      if (user.bio?.length >= 20) c += 15;
                      return Math.min(100, c);
                    })()}
                    tips={(() => {
                      const t = [];
                      if (!user.subjectProfiles?.some(p => p.canTeach)) t.push('Add what subjects you can mentor/teach');
                      if (!user.availabilitySlots?.length) t.push('Set your weekly study time blocks');
                      if (!user.learningGoal?.length) t.push('Choose your current learning goals');
                      return t;
                    })()}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ background: 'var(--card2)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '4px' }}>
                        Study Style
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                        {user.studyStyle === 'silent_focus' && '🤫 Silent Focus (Deep Pomodoro)'}
                        {user.studyStyle === 'discussion_heavy' && '🗣️ Discussion Heavy (Active debater)'}
                        {(!user.studyStyle || user.studyStyle === 'mixed') && '⚖️ Mixed / Flexible (Balanced sprints & chats)'}
                      </div>
                    </div>

                    <div style={{ background: 'var(--card2)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '4px' }}>
                        Learning Goals
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {user.learningGoal?.length > 0 ? (
                          user.learningGoal.map(g => (
                            <span
                              key={g}
                              style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: 'rgba(6, 182, 212, 0.2)',
                                color: 'var(--secondary)',
                                fontSize: '0.78rem',
                                fontWeight: 500
                              }}
                            >
                              🎯 {g.replace('_', ' ')}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>None selected</span>
                        )}
                      </div>
                    </div>

                    <div style={{ background: 'var(--card2)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Timezone:</span>
                      <span style={{ fontWeight: 500 }}>{user.timezone || 'Asia/Kolkata'}</span>
                    </div>
                  </div>
                </div>

                {/* Subject Profiles Tags */}
                <div>
                  <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '8px' }}>
                    Subjects &amp; Proficiency
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(user.subjectProfiles?.length > 0 ? user.subjectProfiles : (user.subjects || []).map(s => ({ name: s.toLowerCase(), displayName: s, level: 'intermediate', wantsToLearn: true }))).map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: 'var(--card2)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.82rem'
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{p.displayName || p.name}</span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: p.level === 'advanced' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(6, 182, 212, 0.2)',
                            color: p.level === 'advanced' ? 'var(--success)' : 'var(--accent)'
                          }}
                        >
                          {p.level || 'intermediate'}
                        </span>
                        {p.canTeach && <span title="Can Mentor">🎓 Mentor</span>}
                        {p.wantsToLearn && <span title="Wants to Learn">📖 Learner</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Badges Grid */}
          <div style={{ marginBottom: '24px' }}>
            <BadgesGrid
              badges={gamification?.badges || []}
              summary={gamification?.badgesSummary || { total: 13, unlocked: 0 }}
            />
          </div>

          {/* Reputation & Feedback */}
          {user._id && (
            <div style={{ marginBottom: '24px' }}>
              <ReputationCard userId={user._id} />
            </div>
          )}

          {/* Privacy & Leaderboard Settings */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text)', marginBottom: '8px' }}>
              🔒 Privacy &amp; Leaderboard Settings
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Control your public visibility across study group and global XP leaderboards.
            </p>

            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={user.leaderboardOptIn !== false}
                onChange={handleToggleOptIn}
                disabled={optInLoading}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>
                  Show my rank on public leaderboards
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  When unchecked, your profile is hidden from all public rankings.
                </div>
              </div>
            </label>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;
