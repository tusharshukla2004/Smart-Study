// ============================================
// Phase 2 Demo Data Seeder
// Generates 60-90 days of realistic study sessions, logs, tasks & peer ratings
// MUST REFUSE TO RUN IN PRODUCTION
// ============================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

if (process.env.NODE_ENV === 'production') {
  console.error('❌ Refusing to run seedDemoData in production environment!');
  process.exit(1);
}

const User = require('../models/User');
const StudyGroup = require('../models/StudyGroup');
const StudySession = require('../models/StudySession');
const SessionLog = require('../models/SessionLog');
const Task = require('../models/Task');
const { PeerRating } = require('../models/PeerRating');
const XpEvent = require('../models/XpEvent');
const { XP_RULES, calculateLevel } = require('../config/gamification');

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-study';

async function seed() {
  console.log('🚀 Connecting to MongoDB for Phase 2 demo seeding...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB.');

  const emailsToClear = [
    'demo@smartstudy.com',
    'sarah.chen@smartstudy.com',
    'liam.patel@smartstudy.com',
    'maya.lin@smartstudy.com',
    'david.kim@smartstudy.com'
  ];

  // Clean previous demo data for these users
  const existingUsers = await User.find({ email: { $in: emailsToClear } });
  const userIds = existingUsers.map(u => u._id);

  if (userIds.length > 0) {
    console.log(`🧹 Cleaning up previous demo records for ${userIds.length} users...`);
    await SessionLog.deleteMany({ user: { $in: userIds } });
    await Task.deleteMany({ userId: { $in: userIds } });
    await PeerRating.deleteMany({ $or: [{ rater: { $in: userIds } }, { ratee: { $in: userIds } }] });
    await XpEvent.deleteMany({ user: { $in: userIds } });
    await StudySession.deleteMany({ host: { $in: userIds } });
    await StudyGroup.deleteMany({ createdBy: { $in: userIds } });
    await User.deleteMany({ _id: { $in: userIds } });
  }

  console.log('🌱 Creating demo users...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const demoUser = await User.create({
    name: 'Alex Rivera',
    email: 'demo@smartstudy.com',
    password: passwordHash,
    university: 'Stanford University',
    major: 'Computer Science',
    academicLevel: 'Undergraduate (Year 3)',
    bio: 'Passionate about distributed systems, AI research, and clean code. Love study sprints with deep focus.',
    subjects: ['Algorithms', 'Machine Learning', 'Web Development', 'Discrete Math'],
    availability: ['Morning (6am – 12pm)', 'Evening (6pm – 10pm)'],
    studyPreferences: 'Evening (6pm – 10pm)',
    avatar: 'AR',
    studyHours: 0,
    groupsJoined: 3,
    tasksCompleted: 0,
    streak: 8,
    longestStreak: 14,
    leaderboardOptIn: true,
    xp: 0,
    level: 1,
    ratingAvg: 4.8,
    ratingCount: 12
  });

  const peerSarah = await User.create({
    name: 'Sarah Chen',
    email: 'sarah.chen@smartstudy.com',
    password: passwordHash,
    university: 'Stanford University',
    major: 'Electrical Engineering',
    academicLevel: 'Undergraduate (Year 4)',
    avatar: 'SC',
    subjects: ['Algorithms', 'Computer Architecture', 'Physics'],
    streak: 12,
    longestStreak: 21,
    xp: 850,
    level: calculateLevel(850),
    ratingAvg: 4.9,
    ratingCount: 18,
    leaderboardOptIn: true
  });

  const peerLiam = await User.create({
    name: 'Liam Patel',
    email: 'liam.patel@smartstudy.com',
    password: passwordHash,
    university: 'UC Berkeley',
    major: 'Data Science',
    academicLevel: 'Masters',
    avatar: 'LP',
    subjects: ['Machine Learning', 'Statistics', 'Python'],
    streak: 5,
    longestStreak: 9,
    xp: 620,
    level: calculateLevel(620),
    ratingAvg: 4.6,
    ratingCount: 10,
    leaderboardOptIn: true
  });

  const peerMaya = await User.create({
    name: 'Maya Lin',
    email: 'maya.lin@smartstudy.com',
    password: passwordHash,
    university: 'MIT',
    major: 'Mathematics',
    academicLevel: 'PhD',
    avatar: 'ML',
    subjects: ['Discrete Math', 'Algorithms', 'Quantum Computing'],
    streak: 19,
    longestStreak: 25,
    xp: 1240,
    level: calculateLevel(1240),
    ratingAvg: 5.0,
    ratingCount: 22,
    leaderboardOptIn: true
  });

  const peerDavid = await User.create({
    name: 'David Kim',
    email: 'david.kim@smartstudy.com',
    password: passwordHash,
    university: 'Carnegie Mellon',
    major: 'Software Engineering',
    academicLevel: 'Undergraduate (Year 2)',
    avatar: 'DK',
    subjects: ['Web Development', 'Database Systems', 'Cloud Computing'],
    streak: 3,
    longestStreak: 6,
    xp: 380,
    level: calculateLevel(380),
    ratingAvg: 4.5,
    ratingCount: 7,
    leaderboardOptIn: true
  });

  const allMembers = [demoUser._id, peerSarah._id, peerLiam._id, peerMaya._id, peerDavid._id];

  console.log('👥 Creating study groups...');
  const groupAlgo = await StudyGroup.create({
    name: 'Algorithms & LeetCode Sprints',
    subject: 'Algorithms',
    description: 'Daily algorithmic problem solving, graph theory, and dynamic programming.',
    maxMembers: 10,
    level: 'Advanced',
    schedule: 'Mon, Wed, Fri 7:00 PM',
    tags: ['algorithms', 'competitive-programming', 'interview-prep'],
    avatar: '⚡',
    createdBy: demoUser._id,
    members: allMembers
  });

  const groupML = await StudyGroup.create({
    name: 'Deep Learning & Neural Nets',
    subject: 'Machine Learning',
    description: 'Reading PyTorch implementations and modern Transformer architectures.',
    maxMembers: 8,
    level: 'Intermediate',
    schedule: 'Tue, Thu 6:00 PM',
    tags: ['machine-learning', 'pytorch', 'ai'],
    avatar: '🤖',
    createdBy: peerLiam._id,
    members: [demoUser._id, peerLiam._id, peerMaya._id, peerSarah._id]
  });

  const groupWeb = await StudyGroup.create({
    name: 'Full-Stack Web Architects',
    subject: 'Web Development',
    description: 'Building modern React, Node, and GraphQL applications together.',
    maxMembers: 12,
    level: 'Intermediate',
    schedule: 'Weekends 10:00 AM',
    tags: ['react', 'node', 'fullstack'],
    avatar: '🌐',
    createdBy: peerDavid._id,
    members: [demoUser._id, peerDavid._id, peerSarah._id]
  });

  const groups = [groupAlgo, groupML, groupWeb];
  const subjectsPool = [
    'Algorithms',
    'Machine Learning',
    'Web Development',
    'Discrete Math',
    'Database Systems',
    'Computer Systems',
    'Cloud Computing',
    'UI Design'
  ];

  console.log('📅 Generating 75 days of realistic study sessions and logs...');
  const now = new Date();
  let totalDemoMinutes = 0;
  let totalDemoXp = 0;
  let sessionLogCount = 0;

  // Generate logs over past 75 days
  for (let daysAgo = 75; daysAgo >= 0; daysAgo--) {
    // 80% chance of studying on any day to build realistic streak pattern
    // Give 8-day current streak at the end (daysAgo 0 to 7)
    const isCurrentStreak = daysAgo <= 7;
    const studyToday = isCurrentStreak || (Math.random() < 0.75);

    if (!studyToday) continue;

    // Number of sessions today (1 to 2)
    const sessionsToday = daysAgo % 6 === 0 ? 2 : 1;

    for (let sIdx = 0; sIdx < sessionsToday; sIdx++) {
      const group = groups[(daysAgo + sIdx) % groups.length];
      const subject = subjectsPool[(daysAgo * 3 + sIdx) % subjectsPool.length];

      // Session start time in hour: morning (8am), afternoon (2pm), or evening (7pm)
      const hourOptions = [8, 14, 19, 21];
      const sessionHour = hourOptions[(daysAgo + sIdx) % hourOptions.length];

      const sessionDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      sessionDate.setHours(sessionHour, 0, 0, 0);

      const focusMinutes = [25, 45, 50, 60, 90][(daysAgo + sIdx) % 5];
      const focusRating = [4, 5, 4, 5, 3, 5][(daysAgo * 2 + sIdx) % 6];

      // Create completed StudySession
      const studySession = await StudySession.create({
        group: group._id,
        host: group.createdBy,
        title: `${subject} Study Sprint #${75 - daysAgo}`,
        subject,
        description: `Deep work session focused on ${subject} principles and exercises.`,
        scheduledAt: sessionDate,
        focusMinutes,
        breakMinutes: 5,
        totalCycles: 2,
        status: 'completed',
        startedAt: sessionDate,
        endedAt: new Date(sessionDate.getTime() + (focusMinutes * 60 * 1000)),
        participants: [
          { user: demoUser._id, joinedAt: sessionDate },
          { user: peerSarah._id, joinedAt: sessionDate },
          { user: peerLiam._id, joinedAt: sessionDate }
        ]
      });

      // Session log for demo user
      const log = await SessionLog.create({
        user: demoUser._id,
        session: studySession._id,
        group: group._id,
        topicsStudied: [subject, `${subject} Exercises`],
        summary: `Focused session covering ${subject} core concepts and sample problems.`,
        focusRating,
        minutesStudied: focusMinutes,
        createdAt: sessionDate
      });

      totalDemoMinutes += focusMinutes;
      sessionLogCount++;

      // XP for this log
      const xpPoints = XP_RULES.calculateSessionLogXp(focusMinutes, focusRating);
      totalDemoXp += xpPoints;

      await XpEvent.create({
        user: demoUser._id,
        type: 'session_log',
        points: xpPoints,
        refId: log._id.toString(),
        createdAt: sessionDate
      });

      // Peer logs for active realism
      await SessionLog.create({
        user: peerSarah._id,
        session: studySession._id,
        group: group._id,
        topicsStudied: [subject],
        summary: 'Collaborative practice.',
        focusRating: 5,
        minutesStudied: focusMinutes,
        createdAt: sessionDate
      });
    }

    // Daily streak continuation XP
    const streakDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    const streakDateStr = streakDate.toISOString().slice(0, 10);
    totalDemoXp += XP_RULES.DAILY_STREAK_XP;

    await XpEvent.create({
      user: demoUser._id,
      type: 'streak_continuation',
      points: XP_RULES.DAILY_STREAK_XP,
      refId: streakDateStr,
      createdAt: streakDate
    });
  }

  console.log('✅ Created realistic study tasks...');
  const taskTemplates = [
    { title: 'Implement Red-Black Tree in C++', subject: 'Algorithms', priority: 'high', status: 'completed', daysAgo: 10 },
    { title: 'Review Transformer Multi-Head Attention', subject: 'Machine Learning', priority: 'high', status: 'completed', daysAgo: 5 },
    { title: 'Build React custom hook for WebSocket sync', subject: 'Web Development', priority: 'medium', status: 'completed', daysAgo: 3 },
    { title: 'Prove Euler formula for planar graphs', subject: 'Discrete Math', priority: 'medium', status: 'completed', daysAgo: 2 },
    { title: 'Dockerize microservice architecture', subject: 'Cloud Computing', priority: 'medium', status: 'in-progress', daysAgo: 1 },
    { title: 'Complete LeetCode dynamic programming pack', subject: 'Algorithms', priority: 'high', status: 'in-progress', daysAgo: 0 },
    { title: 'Design database schema for analytics cache', subject: 'Database Systems', priority: 'low', status: 'pending', daysAgo: 0 },
    { title: 'Submit Machine Learning lab report', subject: 'Machine Learning', priority: 'high', status: 'pending', deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), daysAgo: 1 },
    { title: 'Review Operating Systems memory paging lecture', subject: 'Computer Systems', priority: 'low', status: 'pending', deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), daysAgo: 4 } // Overdue
  ];

  let completedTasksCount = 0;
  for (const t of taskTemplates) {
    const taskCreatedAt = new Date(now.getTime() - (t.daysAgo * 24 * 60 * 60 * 1000));
    const task = await Task.create({
      userId: demoUser._id,
      title: t.title,
      subject: t.subject,
      priority: t.priority,
      status: t.status,
      deadline: t.deadline || new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)),
      createdAt: taskCreatedAt
    });

    if (t.status === 'completed') {
      completedTasksCount++;
      const taskXp = XP_RULES.calculateTaskXp(t.priority);
      totalDemoXp += taskXp;

      await XpEvent.create({
        user: demoUser._id,
        type: 'task_completed',
        points: taskXp,
        refId: task._id.toString(),
        createdAt: taskCreatedAt
      });
    }
  }

  console.log('⭐ Creating peer feedback ratings...');
  // Find a few recent sessions to attach ratings
  const recentSessions = await StudySession.find({ group: groupAlgo._id }).limit(6);
  const sampleComments = [
    'Super helpful breakdown of graph algorithms! Kept the whole group motivated.',
    'Laser-focused and kept us strictly on time with the Pomodoro intervals.',
    'Clear explanations and great collaborative spirit. Loved pair programming.',
    'Very punctual and prepared insightful questions for today\'s topic.',
    'Awesome study partner. Highly recommend working with Alex on complex labs.'
  ];

  for (let i = 0; i < recentSessions.length; i++) {
    const sess = recentSessions[i];
    const peer = [peerSarah, peerLiam, peerMaya, peerDavid][i % 4];

    await PeerRating.create({
      session: sess._id,
      rater: peer._id,
      ratee: demoUser._id,
      rating: [5, 5, 4, 5, 5, 4][i],
      tags: [['helpful', 'focused'], ['good_explainer', 'collaborative'], ['punctual', 'focused'], ['helpful', 'good_explainer']][i % 4],
      comment: sampleComments[i % sampleComments.length],
      createdAt: sess.endedAt
    });

    // Reciprocal rating from demo user
    await PeerRating.create({
      session: sess._id,
      rater: demoUser._id,
      ratee: peer._id,
      rating: 5,
      tags: ['collaborative', 'focused'],
      comment: 'Great peer to study with!',
      createdAt: sess.endedAt
    });
  }

  // Award badges that demo user has earned
  const earnedBadges = [
    { key: 'first_session', earnedAt: new Date(now.getTime() - 74 * 24 * 60 * 60 * 1000) },
    { key: 'streak_3', earnedAt: new Date(now.getTime() - 70 * 24 * 60 * 60 * 1000) },
    { key: 'streak_7', earnedAt: new Date(now.getTime() - 65 * 24 * 60 * 60 * 1000) },
    { key: 'hours_10', earnedAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) },
    { key: 'hours_50', earnedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
    { key: 'team_player', earnedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) },
    { key: 'helpful_peer', earnedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) },
    { key: 'night_owl', earnedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) }
  ];

  // Update demoUser final stats
  demoUser.studyHours = Math.round((totalDemoMinutes / 60) * 10) / 10;
  demoUser.tasksCompleted = completedTasksCount;
  demoUser.xp = totalDemoXp;
  demoUser.level = calculateLevel(totalDemoXp);
  demoUser.badges = earnedBadges;
  demoUser.streak = 8;
  demoUser.longestStreak = 14;
  demoUser.ratingAvg = 4.8;
  demoUser.ratingCount = recentSessions.length;
  await demoUser.save();

  console.log('\n🎉 Phase 2 Demo Data successfully seeded!');
  console.log('---------------------------------------------');
  console.log(`Demo User:     ${demoUser.name} (${demoUser.email})`);
  console.log(`Password:      password123`);
  console.log(`Total Study:   ${demoUser.studyHours} hours across ${sessionLogCount} logged sessions`);
  console.log(`XP & Level:    ${demoUser.xp} XP (Level ${demoUser.level})`);
  console.log(`Streaks:       Current ${demoUser.streak} days, Longest ${demoUser.longestStreak} days`);
  console.log(`Badges Earned: ${demoUser.badges.length} badges`);
  console.log(`Peer Ratings:  ${recentSessions.length} ratings received (Avg: ${demoUser.ratingAvg} ⭐)`);
  console.log(`Tasks:         ${taskTemplates.length} tasks (${completedTasksCount} completed)`);
  console.log('---------------------------------------------\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seeder failed:', err);
  process.exit(1);
});
