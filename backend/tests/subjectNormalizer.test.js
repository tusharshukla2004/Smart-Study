// ============================================
// Unit Tests: Subject Normalizer & Canonicalization
// ============================================

const { normalizeSubject, canonicalizeSubjectProfile } = require('../utils/subjectNormalizer');
const { deriveCoarseSlots } = require('../scripts/migrateSubjectsV2');

describe('Subject Normalizer & Aliases', () => {
  test('strips emojis and trims properly', () => {
    expect(normalizeSubject('📐 Mathematics')).toBe('mathematics');
    expect(normalizeSubject('🤖 Machine Learning')).toBe('machine learning');
    expect(normalizeSubject('💻 Computer Science')).toBe('computer science');
  });

  test('resolves curated abbreviations from alias dictionary', () => {
    expect(normalizeSubject('dsa')).toBe('data structures and algorithms');
    expect(normalizeSubject('os')).toBe('operating systems');
    expect(normalizeSubject('dbms')).toBe('database management systems');
    expect(normalizeSubject('cn')).toBe('computer networks');
    expect(normalizeSubject('oops')).toBe('object oriented programming');
    expect(normalizeSubject('ml')).toBe('machine learning');
    expect(normalizeSubject('ai')).toBe('artificial intelligence');
    expect(normalizeSubject('web dev')).toBe('web development');
  });

  test('preserves programming language symbols like C++ and C#', () => {
    expect(normalizeSubject('C++')).toBe('c++');
    expect(normalizeSubject('C#')).toBe('c#');
    expect(normalizeSubject('Node.js')).toBe('nodejs');
  });

  test('canonicalizeSubjectProfile converts legacy string into rich object', () => {
    const profile = canonicalizeSubjectProfile('⚡ DSA');
    expect(profile).toEqual({
      name: 'data structures and algorithms',
      displayName: 'DSA',
      level: 'intermediate',
      wantsToLearn: true,
      canTeach: false
    });
  });

  test('canonicalizeSubjectProfile handles rich object input', () => {
    const profile = canonicalizeSubjectProfile({
      name: 'Python',
      displayName: 'Python',
      level: 'advanced',
      wantsToLearn: false,
      canTeach: true
    });
    expect(profile.name).toBe('python');
    expect(profile.level).toBe('advanced');
    expect(profile.canTeach).toBe(true);
    expect(profile.wantsToLearn).toBe(false);
  });
});

describe('deriveCoarseSlots migration helper', () => {
  test('derives 5 weekday slots for morning availability', () => {
    const slots = deriveCoarseSlots(['Morning (6am – 12pm)']);
    expect(slots.length).toBe(5);
    expect(slots[0]).toEqual({
      day: 1,
      startMinute: 360,
      endMinute: 720
    });
  });

  test('returns empty array when availability is empty or invalid', () => {
    expect(deriveCoarseSlots([])).toEqual([]);
    expect(deriveCoarseSlots(null)).toEqual([]);
  });
});
