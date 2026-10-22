# 🚀 Phase 3: Matchmaking v2 & Production Hardening — Rollout Guide

This document defines the zero-downtime, safe deployment sequence for **Phase 3: Matchmaking v2 and Hardening** onto the live Smart Study platform.

---

## 🛡️ Pre-requisites & Safety Rules

1. **Additive Changes Only**: All schema updates (`subjectProfiles`, `availabilitySlots`, `learningGoal`, `studyStyle`, `timezone`, `MatchAction`) are purely additive and backward-compatible.
2. **Legacy v1 Endpoint Preserved**: `GET /api/matchmaking` retains its exact v1 response format for existing live clients.
3. **Opt-in Auth Enhancements**: Refresh token rotation is strictly controlled via `ENABLE_REFRESH_TOKENS=false` by default. Existing JWT access tokens remain valid until expiration.
4. **Independent Migration**: The migration script `backend/scripts/migrateSubjectsV2.js` is standalone, idempotent, and **NEVER** runs automatically on server start.

---

## Step 0: Pre-deployment Database Backup

Before applying indexes or running migrations, take a snapshot:

### Option A: MongoDB Atlas Snapshot (Recommended)
1. Open [MongoDB Atlas](https://cloud.mongodb.com/).
2. Navigate to **Deployment** > **Database** > Select your cluster.
3. Click the **Backup** tab > **Take Snapshot Now**.
4. Confirm snapshot creation is complete before proceeding.

### Option B: Local mongodump Archive
```bash
mongodump --uri="<YOUR_MONGODB_ATLAS_CONNECTION_STRING>" --archive=smart_study_pre_phase3_backup.gz --gzip
```

---

## Step 1: Pre-build Database Indexes on MongoDB Atlas

To avoid locking live query execution, create compound indexes with background safety in mongosh / Atlas Data Explorer:

```javascript
// Switch to application database
use smartstudy;

// 1. Index on normalized subject profile names
db.users.createIndex(
  { "subjectProfiles.name": 1 },
  { background: true, name: "idx_subjectProfiles_name" }
);

// 2. Index on user timezone
db.users.createIndex(
  { "timezone": 1 },
  { background: true, name: "idx_timezone" }
);

// 3. Unique compound index on MatchAction (prevents duplicate partner requests)
db.matchactions.createIndex(
  { "user": 1, "targetUser": 1 },
  { unique: true, background: true, name: "idx_user_targetUser_unique" }
);

// 4. Index on MatchAction targetUser and action for fast request lookup
db.matchactions.createIndex(
  { "targetUser": 1, "action": 1 },
  { background: true, name: "idx_targetUser_action" }
);
```

---

## Step 2: Deploy Backend

Deploy the updated backend to your host (e.g., Render / Fly.io / AWS):

### Environment Variables
All new variables have safe fallbacks. Review before deploy:
```env
# Optional Phase 3 Flags (Safe Defaults)
ENABLE_REFRESH_TOKENS=false   # Keep false initially; turn true after smoke tests
REFRESH_TOKEN_SECRET=your-32-byte-random-refresh-token-secret
ALLOW_BENCH_ON_ATLAS=false     # Prevents synthetic benchmarking on live DB
```

### Verification
Once deployed, verify container health:
```bash
# Liveness probe
curl -f https://<YOUR_BACKEND_DOMAIN>/api/health
# Response: {"status":"ok","uptime":...,"timestamp":"..."}

# Readiness probe
curl -f https://<YOUR_BACKEND_DOMAIN>/api/ready
# Response: {"status":"ready","database":"connected","timestamp":"..."}

# Legacy v1 Matchmaking compatibility check
curl -f -H "Authorization: Bearer <TEST_TOKEN>" https://<YOUR_BACKEND_DOMAIN>/api/matchmaking
# Must return: {"success":true,"message":"Matchmaking results generated!","data":{"matchedUsers":[...],"matchedGroups":[...]}}
```

---

## Step 3: Run Standalone Data Migration

Run the idempotent migration script to populate `subjectProfiles` and `availabilitySlots` for existing legacy users:

### Dry Run (Simulate without writing)
```bash
node backend/scripts/migrateSubjectsV2.js --dry-run
```
Expected output:
```
🔍 Starting Subject & Availability Migration to v2...
Mode: DRY RUN (no writes will be committed)
Batch size: 100
...
🎉 Migration Completed!
Summary:
  - Scanned Users:   X
  - Migrated Users:  Y
  - Skipped Users:   Z
  - Errors:          0
```

### Live Run (Apply updates)
```bash
node backend/scripts/migrateSubjectsV2.js
```

---

## Step 4: Deploy Frontend

Deploy the updated frontend to Vercel / Netlify:

### Environment Variables
```env
VITE_ENABLE_MATCHMAKING_V2=true
```

The frontend deploys:
- Dedicated **Matchmaking Hub** (`/matches`) with Discover, Groups, and Requests tabs.
- Profile settings enhancements with `SubjectLevelPicker`, `AvailabilityGrid`, and `ProfileCompletenessMeter`.
- Dashboard "Open Full Matchmaking Hub" direct CTA button.

---

## Step 5: Post-Deployment Smoke Test Checklist

- [ ] `GET /api/health` returns `200` with `status: "ok"`.
- [ ] `GET /api/ready` returns `200` with `status: "ready"` and `database: "connected"`.
- [ ] Log in with an existing user: profile loads smoothly without missing subjects.
- [ ] Open **Profile** > Click **Edit Profile**:
  - Add a subject with level (e.g., "Operating Systems" -> Advanced -> Can Mentor).
  - Select availability slots on the weekly grid.
  - Save changes and verify profile strength meter updates.
- [ ] Open **Matchmaking Hub** (`/matches`):
  - Partner recommendation cards display match percentage, common subjects, mentorship badges, and explainable reasons.
  - Click **Connect** on a candidate: button changes to sent, toast confirms request.
  - Switch to **Connection Requests** tab: outgoing request is listed.
- [ ] Log in as target recipient:
  - Notification received: "New Study Partner Request".
  - Click **Accept & Pair**: 1-on-1 private study group created automatically (`Study Pair: User A & User B`).
- [ ] Verify legacy `/api/matchmaking` endpoint still returns standard v1 payload.

---

## Step 6: Rollback Plan

If unexpected issues occur at any point:

### Frontend Rollback
- Set environment variable `VITE_ENABLE_MATCHMAKING_V2=false` and redeploy frontend, or revert frontend commit. The legacy matchmaking modal on Dashboard and v1 API routes remain 100% active.

### Backend Rollback
- Since all schema changes are additive, rolling back the backend deployment to the previous commit causes **no data loss** and **no downtime**. Old documents with `subjectProfiles` will simply ignore the new fields while reading legacy `subjects`.

### Database Rollback (Extreme contingency only)
- If necessary, restore the Atlas snapshot created in Step 0.
