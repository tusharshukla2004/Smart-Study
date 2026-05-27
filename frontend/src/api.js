/* ============================================
   SMART STUDY - API Integration Layer
   Connects the frontend to the Express backend.
   ============================================ */

const API_BASE = 'https://smart-study-1-mjl7.onrender.com/api';
// ---- Core fetch wrapper ----
async function api(method, path, body = null) {
  const token = localStorage.getItem('ss_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

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
  getMatches: () => api('GET', '/matchmaking')
};

// ---- Chat API ----
const ChatAPI = {
  getHistory: (groupId, limit = 50) => api('GET', '/chat/' + groupId + '?limit=' + limit),
  sendMessage: (groupId, content) => api('POST', '/chat/' + groupId, { content })
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

export { AuthAPI, UserAPI, GroupsAPI, TasksAPI, MatchAPI, Session };
