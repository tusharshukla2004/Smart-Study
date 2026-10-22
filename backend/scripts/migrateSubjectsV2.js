// ============================================
// Phase 3 Data Migration Script: migrateSubjectsV2.js
// ============================================
//
// SAFETY INSTRUCTIONS BEFORE RUNNING IN PRODUCTION:
// 1. Back up MongoDB Atlas:
//    - Go to Atlas Console -> Clusters -> Backup -> Take Snapshot Now
//    - Or run mongodump:
//      mongodump --uri="<MONGO_URI>" --out="./backup-$(date +%Y%m%d)"
//
// 2. Dry run first:
//    node backend/scripts/migrateSubjectsV2.js --dry-run
//
// 3. Live run:
//    node backend/scripts/migrateSubjectsV2.js
//
// 4. Force re-migration (if needed):
//    node backend/scripts/migrateSubjectsV2.js --force
//
// RULES:
// - Standalone script only. NEVER executed on server boot.
// - Idempotent: users already having subjectProfiles are skipped.
// - Batch processing to prevent memory spikes on large userbases.
// ============================================

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const { canonicalizeSubjectProfile, normalizeSubject } = require('../utils/subjectNormalizer');

const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');
const BATCH_SIZE = 100;

// Helper to map coarse availability strings into weekly availability slots
function deriveCoarseSlots(availabilityList = []) {
  if (!Array.isArray(availabilityList) || availabilityList.length === 0) return [];

  const slots = [];
  const days = [1, 2, 3, 4, 5]; // Default weekdays

  for (const label of availabilityList) {
    const l = (label || '').toLowerCase();
    let startMin = null;
    let endMin = null;

    if (l.includes('morning') || l.includes('6am')) {
      startMin = 6 * 60;   // 360 (6:00 AM)
      endMin = 12 * 60;    // 720 (12:00 PM)
    } else if (l.includes('afternoon') || l.includes('12pm')) {
      startMin = 12 * 60;  // 720 (12:00 PM)
      endMin = 18 * 60;    // 1080 (6:00 PM)
    } else if (l.includes('evening') || l.includes('6pm')) {
      startMin = 18 * 60;  // 1080 (6:00 PM)
      endMin = 22 * 60;    // 1320 (10:00 PM)
    } else if (l.includes('night') || l.includes('10pm')) {
      startMin = 22 * 60;  // 1320 (10:00 PM)
      endMin = 24 * 60 - 1;// 1439 (11:59 PM)
    } else if (l.includes('flexible')) {
      startMin = 10 * 60;  // 600 (10:00 AM)
      endMin = 20 * 60;    // 1200 (8:00 PM)
    }

    if (startMin !== null && endMin !== null) {
      for (const day of days) {
        slots.push({ day, startMinute: startMin, endMinute: endMin });
      }
    }
  }

  return slots;
}

async function migrate() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGO_URI is missing in environment variables.');
    process.exit(1);
  }

  console.log('----------------------------------------------------');
  console.log(`📦 Phase 3 Migration: migrateSubjectsV2`);
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no writes will be committed)' : '⚡ LIVE RUN (writing to database)'}`);
  console.log(`Force mode: ${isForce ? 'YES (overwriting existing subjectProfiles)' : 'NO'}`);
  console.log('----------------------------------------------------');

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB.');

  const totalUsers = await User.countDocuments();
  console.log(`👥 Total users scanned: ${totalUsers}`);

  let scanned = 0;
  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (let skip = 0; skip < totalUsers; skip += BATCH_SIZE) {
    const batch = await User.find({})
      .skip(skip)
      .limit(BATCH_SIZE)
      .select('_id name email subjects subjectProfiles availability availabilitySlots timezone learningGoal studyStyle');

    for (const user of batch) {
      scanned++;
      const hasExistingProfiles = Array.isArray(user.subjectProfiles) && user.subjectProfiles.length > 0;

      if (hasExistingProfiles && !isForce) {
        skipped++;
        continue;
      }

      // 1. Derive subjectProfiles from subjects
      const legacySubjects = Array.isArray(user.subjects) ? user.subjects : [];
      const derivedProfiles = legacySubjects
        .map(sub => canonicalizeSubjectProfile(sub))
        .filter(Boolean);

      // 2. Derive availabilitySlots if missing
      const hasSlots = Array.isArray(user.availabilitySlots) && user.availabilitySlots.length > 0;
      const derivedSlots = !hasSlots ? deriveCoarseSlots(user.availability) : user.availabilitySlots;

      // 3. Set defaults for timezone and studyStyle if missing
      const tz = user.timezone || 'Asia/Kolkata';
      const style = user.studyStyle || 'mixed';

      if (isDryRun) {
        console.log(`  [DRY-RUN] Would migrate User ${user._id} (${user.email}): ${derivedProfiles.length} subjects, ${derivedSlots.length} slots`);
        migrated++;
      } else {
        try {
          user.subjectProfiles = derivedProfiles;
          if (!hasSlots && derivedSlots.length > 0) {
            user.availabilitySlots = derivedSlots;
          }
          user.timezone = tz;
          user.studyStyle = style;
          await user.save();
          migrated++;
        } catch (err) {
          console.error(`  ❌ Failed to migrate user ${user._id}: ${err.message}`);
          errors++;
        }
      }
    }
  }

  console.log('\n====================================================');
  console.log('📊 Migration Summary:');
  console.log(`  Total Scanned:  ${scanned}`);
  console.log(`  Migrated:       ${migrated}`);
  console.log(`  Skipped (safe): ${skipped}`);
  console.log(`  Errors:         ${errors}`);
  console.log('====================================================\n');

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB. Done.');
}

if (require.main === module) {
  migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
}

module.exports = {
  migrate,
  deriveCoarseSlots
};
