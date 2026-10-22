// ============================================
// Phase 3 Integration Tests: Matchmaking v2 & Safety
// ============================================

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const dotenv = require('dotenv');
const express = require('express');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const StudyGroup = require('../models/StudyGroup');
const MatchAction = require('../models/MatchAction');
const matchmakingRoutes = require('../routes/matchmakingRoutes');

let app;
let testUser1;
let testUser2;
let token1;
let token2;

beforeAll(async () => {
  const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (mongoose.connection.readyState === 0 && MONGODB_URI) {
    await mongoose.connect(MONGODB_URI);
  }

  // Create isolated test users
  const uniqueSuffix = Date.now();
  testUser1 = await User.create({
    name: `Test Matcher 1 ${uniqueSuffix}`,
    email: `matcher1_${uniqueSuffix}@smartstudy.test`,
    password: 'Password123!',
    subjects: ['Data Structures', 'Algorithms'],
    subjectProfiles: [
      { name: 'data structures', displayName: 'Data Structures', level: 'intermediate', wantsToLearn: false, canTeach: true },
      { name: 'algorithms', displayName: 'Algorithms', level: 'intermediate', wantsToLearn: true, canTeach: false }
    ],
    availability: ['Evening'],
    timezone: 'Asia/Kolkata',
    studyStyle: 'silent_focus',
    learningGoal: ['interview_prep']
  });

  testUser2 = await User.create({
    name: `Test Matcher 2 ${uniqueSuffix}`,
    email: `matcher2_${uniqueSuffix}@smartstudy.test`,
    password: 'Password123!',
    subjects: ['Algorithms', 'Machine Learning'],
    subjectProfiles: [
      { name: 'algorithms', displayName: 'Algorithms', level: 'advanced', wantsToLearn: false, canTeach: true },
      { name: 'machine learning', displayName: 'Machine Learning', level: 'beginner', wantsToLearn: true, canTeach: false }
    ],
    availability: ['Evening'],
    timezone: 'Asia/Kolkata',
    studyStyle: 'silent_focus',
    learningGoal: ['interview_prep']
  });

  const secret = process.env.JWT_SECRET || 'replace-with-a-long-random-secret';
  token1 = jwt.sign({ id: testUser1._id }, secret, { expiresIn: '1h' });
  token2 = jwt.sign({ id: testUser2._id }, secret, { expiresIn: '1h' });

  app = express();
  app.use(express.json());
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });
  app.get('/api/ready', (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    if (isDbConnected) {
      return res.status(200).json({ status: 'ready', database: 'connected', timestamp: new Date().toISOString() });
    }
    return res.status(503).json({ status: 'unready', database: 'disconnected' });
  });
  app.use('/api/matchmaking', matchmakingRoutes);
});

afterAll(async () => {
  if (testUser1 && testUser2) {
    await User.deleteMany({ _id: { $in: [testUser1._id, testUser2._id] } });
    await MatchAction.deleteMany({
      $or: [
        { user: { $in: [testUser1._id, testUser2._id] } },
        { targetUser: { $in: [testUser1._id, testUser2._id] } }
      ]
    });
    await StudyGroup.deleteMany({
      members: { $in: [testUser1._id, testUser2._id] }
    });
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

describe('Matchmaking v1 Backward Compatibility', () => {
  it('GET /api/matchmaking returns the exact legacy shape', async () => {
    const res = await request(app)
      .get('/api/matchmaking')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('matchedUsers');
    expect(res.body.data).toHaveProperty('matchedGroups');
    expect(res.body.data).toHaveProperty('totalUsersScanned');
    expect(res.body.data).toHaveProperty('totalGroupsScanned');
    expect(res.body.data).toHaveProperty('userSubjects');
    expect(res.body.data).toHaveProperty('userAvailability');
    expect(Array.isArray(res.body.data.matchedUsers)).toBe(true);
  });
});

describe('Matchmaking v2 Endpoints', () => {
  it('GET /api/matchmaking/v2/partners returns ranked matches with breakdown and reasons', async () => {
    const res = await request(app)
      .get('/api/matchmaking/v2/partners?limit=10')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('matches');
    expect(res.body.data).toHaveProperty('profileCompleteness');
    expect(res.body.data.profileCompleteness).toHaveProperty('completeness');
    expect(Array.isArray(res.body.data.profileCompleteness.tips)).toBe(true);

    const matches = res.body.data.matches;
    expect(Array.isArray(matches)).toBe(true);

    const partner = matches.find(m => String(m._id) === String(testUser2._id));
    if (partner) {
      expect(partner).toHaveProperty('matchScore');
      expect(partner).toHaveProperty('scoreBreakdown');
      expect(partner.scoreBreakdown).toHaveProperty('subjectOverlap');
      expect(partner.scoreBreakdown).toHaveProperty('complementarity');
      expect(Array.isArray(partner.reasons)).toBe(true);
      expect(partner.reasons.length).toBeGreaterThan(0);
    }
  });

  it('GET /api/matchmaking/v2/groups returns recommended study groups', async () => {
    const res = await request(app)
      .get('/api/matchmaking/v2/groups?limit=5')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('matchedGroups');
    expect(Array.isArray(res.body.data.matchedGroups)).toBe(true);
  });

  it('POST /api/matchmaking/v2/connect/:userId sends a connection request', async () => {
    const res = await request(app)
      .post(`/api/matchmaking/v2/connect/${testUser2._id}`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('sent');

    // Duplicate connect should fail
    const dupRes = await request(app)
      .post(`/api/matchmaking/v2/connect/${testUser2._id}`)
      .set('Authorization', `Bearer ${token1}`);

    expect(dupRes.status).toBe(400);
    expect(dupRes.body.message).toContain('already sent');
  });

  it('GET /api/matchmaking/v2/requests returns incoming and outgoing requests', async () => {
    // Check from testUser2's perspective (recipient)
    const res = await request(app)
      .get('/api/matchmaking/v2/requests')
      .set('Authorization', `Bearer ${token2}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('incoming');
    expect(res.body.data).toHaveProperty('outgoing');
    expect(res.body.data.incoming.length).toBeGreaterThanOrEqual(1);

    const requestItem = res.body.data.incoming.find(
      r => String(r.user._id) === String(testUser1._id)
    );
    expect(requestItem).toBeDefined();
    expect(requestItem.user.name).toBe(testUser1.name);
  });

  it('POST /api/matchmaking/v2/respond/:userId accepts request and creates 1-on-1 group', async () => {
    const res = await request(app)
      .post(`/api/matchmaking/v2/respond/${testUser1._id}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ accept: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('accepted');
    expect(res.body.data).toHaveProperty('group');
    expect(res.body.data.group.members.map(String)).toContain(String(testUser1._id));
    expect(res.body.data.group.members.map(String)).toContain(String(testUser2._id));

    // Accepted candidate should no longer appear in candidate pool
    const partnerRes = await request(app)
      .get('/api/matchmaking/v2/partners?skipCache=true')
      .set('Authorization', `Bearer ${token1}`);

    const partnerIds = partnerRes.body.data.matches.map(m => String(m._id));
    expect(partnerIds).not.toContain(String(testUser2._id));
  });

  it('POST /api/matchmaking/v2/dismiss/:userId marks user as dismissed', async () => {
    // Create a 3rd temporary user
    const tempUser = await User.create({
      name: 'Temp Candidate',
      email: `temp_${Date.now()}@smartstudy.test`,
      password: 'Password123!',
      subjects: ['Data Structures'],
      availability: ['Evening']
    });

    const dismissRes = await request(app)
      .post(`/api/matchmaking/v2/dismiss/${tempUser._id}`)
      .set('Authorization', `Bearer ${token1}`);

    expect(dismissRes.status).toBe(200);
    expect(dismissRes.body.success).toBe(true);

    // Verify dismissed action recorded
    const action = await MatchAction.findOne({
      user: testUser1._id,
      targetUser: tempUser._id
    });
    expect(action).toBeDefined();
    expect(action.action).toBe('dismissed');

    await User.findByIdAndDelete(tempUser._id);
    await MatchAction.findByIdAndDelete(action._id);
  });
});

describe('Hardening & Health Probes', () => {
  it('GET /api/health returns liveness status 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptime');
  });

  it('GET /api/ready returns readiness status 200 when database is connected', async () => {
    const res = await request(app).get('/api/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.database).toBe('connected');
  });
});
