export const showToast = (message, type = 'info', duration = 3000) => {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.className = `toast ${type}`;
  toast.innerHTML = `<strong>${icons[type] || 'ℹ️'} ${message}</strong>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
};

export const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export const validatePassword = (password) => {
  return password.length >= 6;
};
