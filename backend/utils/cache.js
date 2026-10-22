// ============================================
// Simple In-Memory Cache with TTL & User Invalidation
// ============================================

class InMemoryCache {
  constructor() {
    this.store = new Map();
  }

  /**
   * Generates a standard cache key scoped to a user and endpoint query
   */
  makeKey(userId, endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&');
    return `${String(userId)}:${endpoint}:${sortedParams}`;
  }

  /**
   * Retrieves a cached value if not expired
   */
  get(key) {
    const item = this.store.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Stores a value in memory with a TTL (default 60s)
   */
  set(key, value, ttlSeconds = 60) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
  }

  /**
   * Invalidates all cached entries for a given user
   */
  invalidateUser(userId) {
    const prefix = `${String(userId)}:`;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Invalidates all cache entries for a group
   */
  invalidateGroup(groupId) {
    const infix = `:${String(groupId)}:`;
    for (const key of this.store.keys()) {
      if (key.includes(infix) || key.startsWith(`group:${groupId}`)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clears the entire cache (useful for testing)
   */
  clear() {
    this.store.clear();
  }
}

const analyticsCache = new InMemoryCache();

module.exports = {
  analyticsCache,
  InMemoryCache
};
