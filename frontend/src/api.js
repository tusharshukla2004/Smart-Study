/* ============================================
   SMART STUDY - API Integration Layer
   Connects the frontend to the Express backend.
   ============================================ */

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

// ---- Core fetch wrapper ----
async function api(method, path, body = null) {
  const token = localStorage.getItem('ss_token');
  const headers = {};
  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const opts = { method, headers };
  if (body) {
    opts.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  try {
    const res = await fetch(API_BASE + path, opts);
    const data = await res.json();

    // If token is invalid/expired, redirect to login
    if (res.status === 401) {
      localStorage.removeItem('ss_token');
      localStorage.removeItem('ss_user');
      if (!window.location.pathname.includes('/login') &&
          !window.location.pathname.includes('/signup') &&
          window.location.pathname !== '/') {
        window.location.href = '/login';
      }
      return data;
    }

    return data;
  } catch (err) {
    console.error('API Error:', err);
    return { success: false, message: 'Network error. Is the server running?' };
  }
}

// ---- Auth API ----
const AuthAPI = {
  signup: (userData) => api('POST', '/auth/signup', userData),
  login: (email, password) => api('POST', '/auth/login', { email, password })
};

// ---- User API ----
const UserAPI = {
  getProfile: () => api('GET', '/users/profile'),
  updateProfile: (data) => api('PUT', '/users/profile', data)
};

// ---- Groups API ----
const GroupsAPI = {
  getAll: (params = '') => api('GET', '/groups' + (params ? '?' + params : '')),
  getById: (id) => api('GET', '/groups/' + id),
  create: (data) => api('POST', '/groups/create', data),
  join: (groupId) => api('POST', '/groups/join/' + groupId),
  leave: (groupId) => api('POST', '/groups/leave/' + groupId),
  getRecommended: () => api('GET', '/groups/recommended')
};

// ---- Tasks API ----
const TasksAPI = {
  getAll: (params = '') => api('GET', '/tasks' + (params ? '?' + params : '')),
  create: (data) => api('POST', '/tasks', data),
  update: (id, data) => api('PUT', '/tasks/' + id, data),
  delete: (id) => api('DELETE', '/tasks/' + id)
};

// ---- Matchmaking API ----
const MatchAPI = {
  getMatches: () => api('GET', '/matchmaking'),
  // v2 Matchmaking endpoints
  getPartnersV2: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api('GET', `/matchmaking/v2/partners${q ? '?' + q : ''}`);
  },
  getGroupsV2: (limit = 5) => api('GET', `/matchmaking/v2/groups?limit=${limit}`),
  connect: (userId) => api('POST', `/matchmaking/v2/connect/${userId}`),
  respond: (userId, accept) => api('POST', `/matchmaking/v2/respond/${userId}`, { accept }),
  dismiss: (userId) => api('POST', `/matchmaking/v2/dismiss/${userId}`),
  getRequests: () => api('GET', '/matchmaking/v2/requests')
};

// ---- Chat API ----
const ChatAPI = {
  getHistory: (groupId, limit = 50) => api('GET', '/chat/' + groupId + '?limit=' + limit),
  sendMessage: (groupId, content) => api('POST', '/chat/' + groupId, { content })
};

// ---- Study Sessions API (Pomodoro) ----
const SessionAPI = {
  create: (data) => api('POST', '/sessions', data),
  getAll: (params = '') => api('GET', '/sessions' + (params ? '?' + params : '')),
  getUpcoming: () => api('GET', '/sessions/upcoming'),
  getById: (id) => api('GET', `/sessions/${id}`),
  update: (id, data) => api('PUT', `/sessions/${id}`, data),
  cancel: (id) => api('DELETE', `/sessions/${id}`),
  rsvp: (id, status) => api('POST', `/sessions/${id}/rsvp`, { status }),
  submitLog: (id, logData) => api('POST', `/sessions/${id}/log`, logData),
  getMyLogs: (page = 1) => api('GET', `/sessions/logs/me?page=${page}`),
  getIcsDownloadUrl: (id) => `${API_BASE}/sessions/${id}/ics`
};

// ---- Notes API (Markdown) ----
const NotesAPI = {
  getByGroup: (groupId, search = '', tag = '') => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (tag) params.append('tag', tag);
    const qs = params.toString();
    return api('GET', `/groups/${groupId}/notes${qs ? `?${qs}` : ''}`);
  },
  getById: (id) => api('GET', `/notes/${id}`),
  create: (groupId, data) => api('POST', `/groups/${groupId}/notes`, data),
  update: (id, data) => api('PUT', `/notes/${id}`, data),
  delete: (id) => api('DELETE', `/notes/${id}`),
  togglePin: (id) => api('PATCH', `/notes/${id}/pin`)
};

// ---- Resources API (Links & File Uploads) ----
const ResourcesAPI = {
  getByGroup: (groupId) => api('GET', `/groups/${groupId}/resources`),
  create: (groupId, formDataOrJson) => api('POST', `/groups/${groupId}/resources`, formDataOrJson),
  delete: (id) => api('DELETE', `/resources/${id}`)
};

// ---- Notifications API ----
const NotificationAPI = {
  getAll: (unread = false, page = 1) => api('GET', `/notifications?unread=${unread}&page=${page}`),
  getUnreadCount: () => api('GET', '/notifications/unread-count'),
  markAsRead: (id) => api('PATCH', `/notifications/${id}/read`),
  markAllAsRead: () => api('PATCH', '/notifications/read-all'),
  delete: (id) => api('DELETE', `/notifications/${id}`)
};

// ---- Analytics API (Phase 2 Feature A) ----
const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

const AnalyticsAPI = {
  getOverview: (range = '7d', tz = userTz) => api('GET', `/analytics/overview?range=${range}&tz=${encodeURIComponent(tz)}`),
  getStudyTime: (range = '7d', groupBy = 'day', tz = userTz) => api('GET', `/analytics/study-time?range=${range}&groupBy=${groupBy}&tz=${encodeURIComponent(tz)}`),
  getSubjects: (range = '30d', tz = userTz) => api('GET', `/analytics/subjects?range=${range}&tz=${encodeURIComponent(tz)}`),
  getHeatmap: (year = new Date().getFullYear(), tz = userTz) => api('GET', `/analytics/heatmap?year=${year}&tz=${encodeURIComponent(tz)}`),
  getFocusTrend: (range = '30d', tz = userTz) => api('GET', `/analytics/focus-trend?range=${range}&tz=${encodeURIComponent(tz)}`),
  getTasks: (range = '30d') => api('GET', `/analytics/tasks?range=${range}`),
  getGroupAnalytics: (groupId) => api('GET', `/analytics/groups/${groupId}`)
};

// ---- Gamification API (Phase 2 Feature B) ----
const GamificationAPI = {
  getMe: () => api('GET', '/gamification/me'),
  getLeaderboard: (scope = 'global', groupId = '', period = 'week', page = 1) => {
    const params = new URLSearchParams({ scope, period, page });
    if (groupId) params.append('groupId', groupId);
    return api('GET', `/gamification/leaderboard?${params.toString()}`);
  },
  updateOptIn: (optIn) => api('PATCH', '/users/leaderboard-opt', { optIn })
};

// ---- Peer Rating API (Phase 2 Feature C) ----
const RatingAPI = {
  getRateable: (sessionId) => api('GET', `/sessions/${sessionId}/rateable`),
  submitRatings: (sessionId, ratings) => api('POST', `/sessions/${sessionId}/ratings`, { ratings }),
  getReputation: (userId) => api('GET', `/users/${userId}/reputation`)
};

// ---- Session helpers (replaces old SS object for auth) ----
const Session = {
  saveLogin: (token, user) => {
    localStorage.setItem('ss_token', token);
    localStorage.setItem('ss_user', JSON.stringify(user));
  },
  getToken: () => localStorage.getItem('ss_token'),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem('ss_user')); }
    catch { return null; }
  },
  isLoggedIn: () => !!localStorage.getItem('ss_token'),
  logout: () => {
    localStorage.removeItem('ss_token');
    localStorage.removeItem('ss_user');
    window.location.href = '/login';
  },
  // Update cached user locally (after profile update)
  updateUser: (user) => {
    localStorage.setItem('ss_user', JSON.stringify(user));
  },
  // Require auth — redirect if not logged in
  requireAuth: () => {
    if (!localStorage.getItem('ss_token')) {
      window.location.href = '/login';
      return false;
    }
    return true;
  }
};

export {
  AuthAPI,
  UserAPI,
  GroupsAPI,
  TasksAPI,
  MatchAPI,
  ChatAPI,
  SessionAPI,
  NotesAPI,
  ResourcesAPI,
  NotificationAPI,
  AnalyticsAPI,
  GamificationAPI,
  RatingAPI,
  Session
};
