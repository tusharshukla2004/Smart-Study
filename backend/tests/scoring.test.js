// ============================================
// Unit & Property Tests: Matchmaking v2 Scoring Engine
// ============================================

const {
  getTimezoneOffsetMinutes,
  computeSubjectOverlap,
  computeComplementarity,
  computeAvailabilityOverlap,
  computeGoalAndStyle,
  computeReputation,
  computeActivityRecency,
  generateReasons,
  calculateOverallMatch,
  getEffectiveSubjectProfiles
} = require('../services/matchmaking/scoring');

describe('Matchmaking v2: Pure Scoring Engine', () => {

  describe('1. Subject Overlap (Jaccard)', () => {
    test('computes exact Jaccard similarity', () => {
      const a = [{ name: 'algorithms' }, { name: 'machine learning' }];
      const b = [{ name: 'algorithms' }, { name: 'web development' }];
      // intersection: 1, union: 3 -> 1/3 = 0.33
      expect(computeSubjectOverlap(a, b)).toBe(0.33);
    });

    test('is symmetric: overlap(A, B) === overlap(B, A)', () => {
      const a = [{ name: 'os' }, { name: 'dbms' }];
      const b = [{ name: 'dbms' }, { name: 'cn' }, { name: 'oops' }];
      expect(computeSubjectOverlap(a, b)).toBe(computeSubjectOverlap(b, a));
    });

    test('returns 0 for empty or disjoint subjects', () => {
      expect(computeSubjectOverlap([], [{ name: 'math' }])).toBe(0);
      expect(computeSubjectOverlap([{ name: 'physics' }], [{ name: 'chemistry' }])).toBe(0);
    });
  });

  describe('2. Complementarity (Teach vs Learn)', () => {
    test('awards 1.0 for mutual mentoring across shared subjects', () => {
      // User A can teach algorithms, wants to learn ml
      // User B wants to learn algorithms, can teach ml
      const a = [
        { name: 'algorithms', canTeach: true, wantsToLearn: false, displayName: 'Algorithms' },
        { name: 'ml', canTeach: false, wantsToLearn: true, displayName: 'ML' }
      ];
      const b = [
        { name: 'algorithms', canTeach: false, wantsToLearn: true, displayName: 'Algorithms' },
        { name: 'ml', canTeach: true, wantsToLearn: false, displayName: 'ML' }
      ];

      const result = computeComplementarity(a, b);
      expect(result.score).toBe(1.0);
      expect(result.sharedDetails[0].relationship).toBe('mutual_mentoring');
    });

    test('awards 0.65 for one-way mentor relationship', () => {
      const a = [{ name: 'algorithms', canTeach: true, wantsToLearn: false, displayName: 'Algorithms' }];
      const b = [{ name: 'algorithms', canTeach: false, wantsToLearn: true, displayName: 'Algorithms' }];

      const result = computeComplementarity(a, b);
      expect(result.score).toBe(0.65);
      expect(result.sharedDetails[0].relationship).toBe('a_mentors_b');
    });

    test('awards 0.45 for equal-level co-learners', () => {
      const a = [{ name: 'algorithms', level: 'intermediate', wantsToLearn: true, canTeach: false }];
      const b = [{ name: 'algorithms', level: 'intermediate', wantsToLearn: true, canTeach: false }];

      const result = computeComplementarity(a, b);
      expect(result.score).toBe(0.45);
      expect(result.sharedDetails[0].relationship).toBe('peer_study');
    });
  });

  describe('3. Availability Overlap & Timezones', () => {
    test('converts IST and UTC slots and finds overlapping study minutes', () => {
      // User A in UTC: Monday 10:00 to 14:00 (600 to 840)
      const userA = {
        timezone: 'UTC',
        availabilitySlots: [{ day: 1, startMinute: 600, endMinute: 840 }]
      };

      // User B in Asia/Kolkata (+5:30): Monday 15:30 to 19:30 (930 to 1170)
      // Converted to UTC: 930 - 330 = 600, 1170 - 330 = 840 (exact 4-hour match!)
      const userB = {
        timezone: 'Asia/Kolkata',
        availabilitySlots: [{ day: 1, startMinute: 930, endMinute: 1170 }]
      };

      const result = computeAvailabilityOverlap(userA, userB);
      expect(result.overlapMinutes).toBe(240); // 4 hours
      expect(result.score).toBe(0.80); // 240 / 300 = 0.80
      expect(result.isCoarseFallback).toBe(false);
    });

    test('falls back to coarse labels if structured slots are missing', () => {
      const userA = { availability: ['Evening (6pm – 10pm)'] };
      const userB = { availability: ['Evening (6pm – 10pm)'] };

      const result = computeAvailabilityOverlap(userA, userB);
      expect(result.isCoarseFallback).toBe(true);
      expect(result.score).toBe(1.0);
    });
  });

  describe('4. Goal & Study Style', () => {
    test('evaluates common goals and study style matrix', () => {
      const userA = {
        learningGoal: ['exam_prep', 'projects'],
        studyStyle: 'silent_focus'
      };
      const userB = {
        learningGoal: ['exam_prep'],
        studyStyle: 'silent_focus'
      };

      const result = computeGoalAndStyle(userA, userB);
      expect(result.commonGoals).toEqual(['exam_prep']);
      expect(result.styleMatch).toBe(1.0);
      expect(result.score).toBeGreaterThan(0.7);
    });

    test('penalizes conflicting study styles (silent focus vs discussion heavy)', () => {
      const userA = { studyStyle: 'silent_focus' };
      const userB = { studyStyle: 'discussion_heavy' };

      const result = computeGoalAndStyle(userA, userB);
      expect(result.styleMatch).toBe(0.2);
    });
  });

  describe('5. Reputation & Activity Recency', () => {
    test('assigns neutral reputation (0.70) when reviews < 3', () => {
      expect(computeReputation(5.0, 1)).toBe(0.70);
      expect(computeReputation(0, 0)).toBe(0.70);
    });

    test('computes Bayesian score when reviews >= 3', () => {
      const score = computeReputation(4.8, 10);
      expect(score).toBeGreaterThan(0.8);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    test('decays activity recency over 30 days', () => {
      const today = new Date();
      expect(computeActivityRecency(today)).toBe(1.0);

      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
      expect(computeActivityRecency(twentyDaysAgo)).toBeLessThan(0.6);

      const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      expect(computeActivityRecency(fortyDaysAgo)).toBe(0.10);
    });
  });

  describe('6. Overall Match & Invariants (Property tests)', () => {
    test('score is strictly bounded between 0 and 100 with no NaNs', () => {
      const userA = {
        subjects: ['Algorithms', 'Python'],
        availability: ['Morning (6am – 12pm)'],
        studyStyle: 'mixed'
      };
      const userB = {
        subjects: ['Python', 'Web Development'],
        availability: ['Morning (6am – 12pm)'],
        studyStyle: 'mixed'
      };

      const match = calculateOverallMatch(userA, userB);
      expect(Number.isInteger(match.matchScore)).toBe(true);
      expect(match.matchScore).toBeGreaterThanOrEqual(0);
      expect(match.matchScore).toBeLessThanOrEqual(100);
      expect(isNaN(match.matchScore)).toBe(false);
      expect(match.reasons.length).toBeGreaterThan(0);
    });

    test('fallback works for users with only legacy subjects and no subjectProfiles', () => {
      const legacyUser = {
        subjects: ['Calculus', 'Linear Algebra'],
        availability: ['Flexible']
      };
      const profiles = getEffectiveSubjectProfiles(legacyUser);
      expect(profiles.length).toBe(2);
      expect(profiles[0].name).toBe('calculus');
      expect(profiles[0].wantsToLearn).toBe(true);
    });

    test('hard filters out pairs with zero shared subjects and zero availability overlap', () => {
      const userA = {
        subjectProfiles: [{ name: 'biology', wantsToLearn: true }],
        availabilitySlots: [{ day: 0, startMinute: 0, endMinute: 60 }],
        timezone: 'UTC'
      };
      const userB = {
        subjectProfiles: [{ name: 'astronomy', wantsToLearn: true }],
        availabilitySlots: [{ day: 3, startMinute: 600, endMinute: 720 }],
        timezone: 'UTC'
      };

      const match = calculateOverallMatch(userA, userB);
      expect(match.matchScore).toBe(0);
      expect(match.isCompatible).toBe(false);
    });
  });
});
