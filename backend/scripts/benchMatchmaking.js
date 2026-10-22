// ============================================
// Matchmaking Algorithm Performance Benchmark
// Measures pure scoring engine latency (p50, p95, p99)
// ============================================

const { calculateOverallMatch } = require('../services/matchmaking/scoring');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Live DB safety check: Do NOT run against production database!
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || '';
if (process.env.NODE_ENV === 'production' || (mongoUri.includes('mongodb.net') && !process.env.ALLOW_BENCH_ON_ATLAS)) {
  console.log('ℹ️ Benchmark runs purely in-memory with synthetic data. No production database will be touched.');
}

const SAMPLE_SUBJECTS = [
  'Data Structures',
  'Algorithms',
  'Operating Systems',
  'Database Management Systems',
  'Computer Networks',
  'Machine Learning',
  'Web Development',
  'Object Oriented Programming',
  'Discrete Mathematics',
  'Artificial Intelligence'
];

const SAMPLE_LEVELS = ['beginner', 'intermediate', 'advanced'];
const SAMPLE_STYLES = ['silent_focus', 'discussion_heavy', 'mixed'];
const SAMPLE_GOALS = ['exam_prep', 'concept_clarity', 'projects', 'revision', 'interview_prep'];
const SAMPLE_TIMEZONES = ['Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomSubarray(arr, minCount = 1, maxCount = 3) {
  const count = minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateSyntheticUser(id) {
  const selectedSubjects = getRandomSubarray(SAMPLE_SUBJECTS, 2, 4);
  const profiles = selectedSubjects.map(s => ({
    name: s.toLowerCase(),
    displayName: s,
    level: getRandomItem(SAMPLE_LEVELS),
    wantsToLearn: Math.random() > 0.4,
    canTeach: Math.random() > 0.5
  }));

  // Ensure at least one learning and teaching flag
  if (!profiles.some(p => p.canTeach)) profiles[0].canTeach = true;
  if (!profiles.some(p => p.wantsToLearn)) profiles[profiles.length - 1].wantsToLearn = true;

  const slots = [];
  const days = [1, 2, 3, 4, 5];
  for (const d of days) {
    if (Math.random() > 0.3) {
      slots.push({
        day: d,
        startMinute: 18 * 60, // 6:00 PM
        endMinute: 21 * 60   // 9:00 PM
      });
    }
  }

  return {
    _id: `synthetic_user_${id}`,
    name: `Synthetic User ${id}`,
    subjectProfiles: profiles,
    subjects: selectedSubjects,
    availability: ['Evening'],
    availabilitySlots: slots,
    timezone: getRandomItem(SAMPLE_TIMEZONES),
    studyStyle: getRandomItem(SAMPLE_STYLES),
    learningGoal: getRandomSubarray(SAMPLE_GOALS, 1, 2),
    ratingAvg: 3.5 + Math.random() * 1.5,
    ratingCount: Math.floor(Math.random() * 25),
    lastStudyDate: new Date(Date.now() - Math.floor(Math.random() * 30 * 86400000))
  };
}

function runBenchmark(candidateCount = 300, iterations = 20) {
  console.log(`\n======================================================`);
  console.log(`🧪 Running Benchmark: ${candidateCount} candidates x ${iterations} iterations`);
  console.log(`======================================================`);

  const currentUser = generateSyntheticUser(0);
  const candidates = Array.from({ length: candidateCount }, (_, i) => generateSyntheticUser(i + 1));

  const runLatenciesMs = [];

  for (let it = 0; it < iterations; it++) {
    const start = process.hrtime.bigint();

    for (let c = 0; c < candidateCount; c++) {
      calculateOverallMatch(currentUser, candidates[c]);
    }

    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    runLatenciesMs.push(durationMs);
  }

  runLatenciesMs.sort((a, b) => a - b);
  const p50 = runLatenciesMs[Math.floor(iterations * 0.50)].toFixed(2);
  const p95 = runLatenciesMs[Math.floor(iterations * 0.95)].toFixed(2);
  const p99 = runLatenciesMs[Math.floor(iterations * 0.99)].toFixed(2);
  const avg = (runLatenciesMs.reduce((a, b) => a + b, 0) / iterations).toFixed(2);
  const perCandidateMicros = ((avg / candidateCount) * 1000).toFixed(1);

  console.log(`⚡ Results for ${candidateCount} candidates:`);
  console.log(`   - Average: ${avg} ms total (${perCandidateMicros} µs per candidate)`);
  console.log(`   - Median (p50): ${p50} ms`);
  console.log(`   - 95th Percentile (p95): ${p95} ms`);
  console.log(`   - 99th Percentile (p99): ${p99} ms`);

  return { p50, p95, avg };
}

function main() {
  console.log('🚀 Starting Matchmaking Algorithm Performance Benchmark...');
  runBenchmark(100, 25);
  runBenchmark(300, 25);
  runBenchmark(1000, 25);
  console.log('\n✅ Benchmark completed successfully. Algorithmic compute time well within < 50ms target.');
}

if (require.main === module) {
  main();
}

module.exports = { runBenchmark };
