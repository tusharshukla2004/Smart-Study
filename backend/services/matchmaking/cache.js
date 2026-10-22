// ============================================
// Matchmaking In-Memory TTL Cache
// 5-minute cache per user with targeted invalidation
// ============================================

const CONFIG = require('./config');

class MatchmakingCache {
  constructor() {
    this.store = new Map();
  }

  makeKey(userId, type = 'partners', query = {}) {
    const sorted = Object.keys(query)
      .sort()
      .map(k => `${k}=${query[k]}`)
      .join('&');
    return `${String(userId)}:${type}:${sorted}`;
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, ttlSeconds = CONFIG.cacheTtlSeconds || 300) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
  }

  invalidateUser(userId) {
    const prefix = `${String(userId)}:`;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear() {
    this.store.clear();
  }
}

const matchmakingCache = new MatchmakingCache();

module.exports = {
  matchmakingCache,
  MatchmakingCache
};
