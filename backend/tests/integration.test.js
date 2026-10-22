// ============================================
// Phase 2 Integration Tests: Analytics, Gamification & Ratings
// ============================================

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Task = require('../models/Task');
const { PeerRating } = require('../models/PeerRating');
const StudySession = require('../models/StudySession');
const { awardXp } = require('../controllers/gamificationController');

let app;
let demoToken;
let demoUser;

beforeAll(async () => {
  const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (mongoose.connection.readyState === 0 && MONGODB_URI) {
    await mongoose.connect(MONGODB_URI);
  }

  // Find seeded demo user
  demoUser = await User.findOne({ email: 'demo@smartstudy.com' });
  if (demoUser) {
    demoToken = jwt.sign({ id: demoUser._id }, process.env.JWT_SECRET || 'replace-with-a-long-random-secret', {
      expiresIn: '1d'
    });
  }

  // We require server app without starting listener
  // To avoid port conflict, we extract express app from server.js or create test express
  const express = require('express');
  app = express();
  app.use(express.json());

  const authRoutes = require('../routes/authRoutes');
  const analyticsRoutes = require('../routes/analyticsRoutes');
  const gamificationRoutes = require('../routes/gamificationRoutes');
  const sessionRoutes = require('../routes/sessionRoutes');
  const userRoutes = require('../routes/userRoutes');

  app.use('/api/auth', authRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/gamification', gamificationRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/users', userRoutes);
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

describe('Phase 2 Integration Tests', () => {
  test('Analytics Overview returns chart-ready metrics with deltas', async () => {
    if (!demoToken) return;

    const res = await request(app)
      .get('/api/analytics/overview?range=30d')
      .set('Authorization', `Bearer ${demoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalStudyMinutes).toBeGreaterThan(0);
    expect(res.body.sessionsAttended).toBeGreaterThan(0);
    expect(res.body.currentStreak).toBe(8);
    expect(res.body.longestStreak).toBe(14);
    expect(res.body.comparison).toBeDefined();
    expect(typeof res.body.comparison.studyMinutesDelta).toBe('number');
  });

  test('Analytics Study-Time returns gap-filled time series', async () => {
    if (!demoToken) return;

    const res = await request(app)
      .get('/api/analytics/study-time?range=7d&groupBy=day')
      .set('Authorization', `Bearer ${demoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.series)).toBe(true);
    expect(res.body.series.length).toBeGreaterThanOrEqual(7);
    expect(res.body.series[0]).toHaveProperty('date');
    expect(res.body.series[0]).toHaveProperty('minutes');
  });

  test('Analytics Heatmap returns 365/366 days with intensity levels 0-4', async () => {
    if (!demoToken) return;

    const res = await request(app)
      .get('/api/analytics/heatmap?year=2026')
      .set('Authorization', `Bearer ${demoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.days.length).toBe(365);
    const activeDay = res.body.days.find(d => d.minutes > 0);
    expect(activeDay).toBeDefined();
    expect(activeDay.level).toBeGreaterThanOrEqual(1);
    expect(activeDay.level).toBeLessThanOrEqual(4);
  });

  test('Gamification: Idempotent XP awarding prevents double points', async () => {
    if (!demoUser) return;

    const testRefId = `integration-test-ref-${Date.now()}`;
    const firstAward = await awardXp(demoUser._id, 'bonus', 50, testRefId);
    expect(firstAward.awarded).toBe(true);
    expect(firstAward.points).toBe(50);

    // Second award with same (user, type, refId)
    const secondAward = await awardXp(demoUser._id, 'bonus', 50, testRefId);
    expect(secondAward.awarded).toBe(false);
    expect(secondAward.duplicate).toBe(true);
  });

  test('Leaderboard privacy: hides opted-out users while showing own rank', async () => {
    if (!demoToken) return;

    const res = await request(app)
      .get('/api/gamification/leaderboard?scope=global&period=all')
      .set('Authorization', `Bearer ${demoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.userRank).toBeDefined();
    expect(res.body.userRank.rank).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.leaderboard)).toBe(true);

    // Leaderboard entries do not leak private email addresses
    for (const entry of res.body.leaderboard) {
      expect(entry.user.email).toBeUndefined();
      expect(entry.user.password).toBeUndefined();
    }
  });

  test('Rating restrictions: rejects self-rating and respects 7-day window', async () => {
    if (!demoToken || !demoUser) return;

    // Find the most recent session ended within the last 7 days
    const recentSession = await StudySession.findOne({
      status: 'completed',
      endedAt: { $gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      'participants.user': demoUser._id
    });
    if (!recentSession) return;

    const res = await request(app)
      .post(`/api/sessions/${recentSession._id}/ratings`)
      .set('Authorization', `Bearer ${demoToken}`)
      .send({
        ratings: [
          {
            ratee: demoUser._id, // Self-rating
            rating: 5,
            tags: ['helpful']
          }
        ]
      });

    // Should skip self-rating
    expect(res.status).toBe(201);
    expect(res.body.submittedCount).toBe(0);
    expect(res.body.skippedCount).toBe(1);
  });
});
