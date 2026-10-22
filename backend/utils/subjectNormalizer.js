// ============================================
// Subject Normalizer & Alias Canonicalizer
// Phase 3 Deterministic Normalization
// (Extension point for semantic matching in Phase 4)
// ============================================

const path = require('path');
const aliases = require('../config/subjectAliases.json');

/**
 * Normalizes a subject string:
 * 1. Strips emojis and leading/trailing punctuation
 * 2. Lowercases and collapses multiple spaces
 * 3. Normalizes common tech symbols (e.g. c++ preserved, node.js -> nodejs)
 * 4. Resolves known aliases from subjectAliases.json
 *
 * @param {string} raw - Raw subject string (e.g., "📐 Mathematics", "DSA", "Node.js")
 * @returns {string} Normalized canonical subject name
 */
function normalizeSubject(raw) {
  if (!raw || typeof raw !== 'string') return '';

  // 1. Strip emojis and leading icons (common in Smart-Study labels)
  let clean = raw.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

  // 2. Trim and lowercase
  clean = clean.toLowerCase().trim();

  // 3. Normalize specific dot notations (e.g. node.js -> nodejs, react.js -> reactjs, vue.js -> vuejs)
  clean = clean.replace(/\.js\b/g, 'js');

  // 4. Remove unwanted punctuation while preserving +, # for C++, C#
  clean = clean.replace(/[^\w\s+#-]/g, ' ');

  // 5. Collapse consecutive spaces and hyphens
  clean = clean.replace(/[\s-]+/g, ' ').trim();

  // 6. Check alias dictionary
  if (aliases[clean]) {
    return aliases[clean];
  }

  // 7. Check if multi-word starts with an alias (e.g. "dsa problems" -> "data structures and algorithms problems")
  const words = clean.split(' ');
  if (words.length > 1 && aliases[words[0]]) {
    words[0] = aliases[words[0]];
    return words.join(' ');
  }

  // Phase 4 Extension Point:
  // Hook for vector embedding / LLM semantic similarity lookup.
  // Example: if (SEMANTIC_MATCHING_ENABLED) return await getEmbeddingId(clean);

  return clean;
}

/**
 * Transforms a raw subject (string or object) into a validated v2 SubjectProfile
 *
 * @param {string|object} item
 * @returns {{ name: string, displayName: string, level: string, wantsToLearn: boolean, canTeach: boolean }}
 */
function canonicalizeSubjectProfile(item) {
  if (typeof item === 'string') {
    const displayName = item.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim() || item.trim();
    return {
      name: normalizeSubject(displayName),
      displayName: displayName,
      level: 'intermediate',
      wantsToLearn: true,
      canTeach: false
    };
  }

  if (item && typeof item === 'object') {
    const rawDisplay = (item.displayName || item.name || '').trim();
    const cleanDisplay = rawDisplay.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim() || rawDisplay;
    const normalizedName = item.name ? normalizeSubject(item.name) : normalizeSubject(cleanDisplay);

    const validLevels = ['beginner', 'intermediate', 'advanced'];
    const level = validLevels.includes(item.level) ? item.level : 'intermediate';

    return {
      name: normalizedName,
      displayName: cleanDisplay || normalizedName,
      level,
      wantsToLearn: item.wantsToLearn !== undefined ? Boolean(item.wantsToLearn) : true,
      canTeach: item.canTeach !== undefined ? Boolean(item.canTeach) : false
    };
  }

  return null;
}

module.exports = {
  normalizeSubject,
  canonicalizeSubjectProfile
};
