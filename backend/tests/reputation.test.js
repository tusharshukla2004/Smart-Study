// ============================================
// Unit Tests: Reputation & Bayesian Rating
// ============================================

const { calculateBayesianScore } = require('../utils/reputation');

describe('Bayesian Reputation Scoring', () => {
  test('returns prior baseline (3.5) when user has 0 ratings', () => {
    const score = calculateBayesianScore(0, 0, 3, 3.5);
    expect(score).toBe(3.5);
  });

  test('pulls single 5-star rating towards prior mean (dampens small-sample bias)', () => {
    // 1 rating of 5: (3 * 3.5 + 5) / (3 + 1) = 15.5 / 4 = 3.875 -> 3.88
    const score = calculateBayesianScore(1, 5, 3, 3.5);
    expect(score).toBe(3.88);
  });

  test('pulls single 1-star rating towards prior mean', () => {
    // 1 rating of 1: (3 * 3.5 + 1) / (3 + 1) = 11.5 / 4 = 2.875 -> 2.88
    const score = calculateBayesianScore(1, 1, 3, 3.5);
    expect(score).toBe(2.88);
  });

  test('converges toward actual average with large sample size', () => {
    // 100 ratings averaging 4.9: sum = 490. (10.5 + 490) / 103 = 500.5 / 103 = 4.86
    const score = calculateBayesianScore(100, 490, 3, 3.5);
    expect(score).toBe(4.86);
  });
});
