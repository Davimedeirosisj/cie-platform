# DAY 1: Staging Deployment - START NOW 🚀

**Date:** July 29, 2026
**Status:** BEGINNING DAY 1
**Duration:** 24 hours
**Objective:** Validate all systems on staging environment

---

## **PRE-FLIGHT (Next 30 minutes)**

### Step 1: Verify Clean State
```bash
# Check git status
git status
# Expected: nothing to commit, working tree clean

# Check current branch
git branch -vv
# Expected: * master (or main)

# Verify latest commit
git log -1 --oneline
# Expected: 48ff3b5 Add production deployment documentation & monitoring
```

### Step 2: Verify Environment
```bash
# Check Node version
node --version
# Expected: v20.x or higher

# Check npm version
npm --version
# Expected: v10.x or higher

# Verify .env.local exists
test -f .env.local && echo "✅ .env.local found" || echo "❌ .env.local missing"

# List environment variables (without values)
grep -o "^[^=]*" .env.local | sort
```

### Step 3: Build Verification
```bash
# Clean build
npm run build

# Watch for:
# - No TypeScript errors
# - Build time: _____ seconds
# - Build size: _____ MB
# - Result: SUCCESS ✅ or FAILED ❌
```

### Step 4: Full Test Suite
```bash
# Run all tests
npm run test

# Watch for:
# - Test count: _____ passed, _____ failed
# - Coverage: _____%
# - Result: SUCCESS ✅ or FAILED ❌

# If failed:
# - Check error message
# - Fix issue before continuing
# - Re-run until passing
```

### Step 5: Lint Check
```bash
# Run ESLint
npm run lint

# Expected: 0 errors, 0 warnings
# Result: SUCCESS ✅ or FAILED ❌
```

### Step 6: TypeScript Check
```bash
# Type check
npx tsc --noEmit

# Expected: 0 errors
# Result: SUCCESS ✅ or FAILED ❌
```

---

## **STAGING DEPLOYMENT (Next 45 minutes)**

### Step 7: Deploy to Staging
```bash
# Deploy to staging environment
vercel deploy --env staging

# Save output:
# Staging URL: _____________________
# Deployment ID: _____________________
# Deployment Time: _____ seconds
```

### Step 8: Verify Staging Deployment
```bash
# Health check
curl https://cie-staging.vercel.app/health

# Expected: 200 OK
# Response time: _____ ms
# Response body:
```

### Step 9: Check All Endpoints
```bash
# Test endpoints
curl https://cie-staging.vercel.app/api/health
curl https://cie-staging.vercel.app/api/campanhas
curl https://cie-staging.vercel.app/api/territorio
curl https://cie-staging.vercel.app/api/rankings

# Expected: All 200 or 401 (auth required)
# Results:
# - /health: _____ ✅/❌
# - /campanhas: _____ ✅/❌
# - /territorio: _____ ✅/❌
# - /rankings: _____ ✅/❌
```

### Step 10: Verify Security Headers
```bash
# Check security headers
curl -I https://cie-staging.vercel.app | grep -E "Content-Security|Strict-Transport|X-Frame|X-Content"

# Expected headers:
# - Content-Security-Policy: ✅/❌
# - Strict-Transport-Security: ✅/❌
# - X-Frame-Options: ✅/❌
# - X-Content-Type-Options: ✅/❌
```

### Step 11: Database Validation
```bash
# Connect to staging database
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM campanhas;"

# Expected: Should return a number (0 or more)
# Result: _____ records

psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM profiles;"
# Result: _____ records

psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM audit_log;"
# Result: _____ records
```

---

## **MONITORING SETUP (Next 20 minutes)**

### Step 12: Start Monitoring Script
```bash
# Make script executable
chmod +x scripts/deploy-monitor.sh

# Run validation check
./scripts/deploy-monitor.sh staging validation

# Expected output:
# ✅ Health: OK
# ✅ /api/health
# ✅ /api/campanhas
# ✅ /api/territorio
# ✅ /api/rankings
# ✅ WebSocket: Connected
# ✅ Performance: XXX ms
```

### Step 13: Configure Continuous Monitoring
```bash
# Start monitoring loop in background
./scripts/deploy-monitor.sh staging monitoring &

# This will:
# - Check health every 15 seconds
# - Log to monitoring.log
# - Alert on issues
# - Run for 24 hours

# Verify monitoring started
ps aux | grep deploy-monitor
```

### Step 14: Set Up Alert Notifications
```bash
# Option 1: Slack webhook (if configured)
# Update SLACK_WEBHOOK_URL in scripts/deploy-monitor.sh

# Option 2: Email alerts (if configured)
# Update EMAIL_ALERT in scripts/deploy-monitor.sh

# Option 3: Dashboard monitoring
# Open Sentry: https://sentry.io/organizations/cie/issues/
# Open Vercel: https://vercel.com/dashboard
```

---

## **TESTING BEGINS (Next 24 hours)**

### Step 15: Notify Testing Team
```
Email/Slack to testing team:

Subject: CIE Staging Deployment Ready - Day 1 Validation

Staging URL: https://cie-staging.vercel.app
Test Duration: 24 hours
Start Time: [TIME]
End Time: [TIME + 24h]

Test Plan: See DEPLOYMENT_DAILY_CHECKLIST.md

Required tests:
✅ Authentication (3 tests)
✅ Campaign Management (4 tests)
✅ Territory CRUD (4 tests)
✅ Vote Import (4 tests)
✅ Dashboard (4 tests)
✅ Rankings (4 tests)
✅ Real-time Features (5 tests)

Status Page: https://status.cie.app
Slack Channel: #cie-deployment
```

### Step 16: 24-Hour Testing Window

**Assign testers:**
- Tester 1: _____________________
- Tester 2: _____________________
- Tester 3: _____________________

**Testing schedule:**
- Hours 0-8: Core features (Auth, Campaigns, Territory)
- Hours 8-16: Data operations (Import, Dashboard, Rankings)
- Hours 16-24: Real-time features (Presence, Editing, Notifications)

**Each tester uses checklist:**
```
AUTHENTICATION TESTS:
- [ ] Sign up new account
- [ ] Login with credentials
- [ ] Session persistence
- [ ] Password reset
- [ ] Logout

CAMPAIGN TESTS:
- [ ] Create new campaign
- [ ] Edit campaign details
- [ ] Change campaign status
- [ ] Switch campaigns
- [ ] Delete campaign

TERRITORY TESTS:
- [ ] Create municipio
- [ ] Edit municipio
- [ ] Create bairro
- [ ] Delete bairro
- [ ] Verify hierarchy

IMPORT TESTS:
- [ ] Upload valid Excel
- [ ] Parse validation
- [ ] Data import
- [ ] Error handling
- [ ] File cleanup

DASHBOARD TESTS:
- [ ] Page load (< 5ms with cache)
- [ ] KPI cards render
- [ ] Charts display
- [ ] Mobile responsiveness
- [ ] Data accuracy

RANKINGS TESTS:
- [ ] Load rankings
- [ ] Sort by votes
- [ ] Filter by level
- [ ] Pagination
- [ ] Export

REAL-TIME TESTS:
- [ ] Presence tracking
- [ ] Live editing
- [ ] Conflict resolution
- [ ] Notifications
- [ ] Audit trail
```

---

## **CONTINUOUS MONITORING (24 hours)**

### Every 4 Hours: Check Status
```bash
# Pull latest metrics
./scripts/deploy-monitor.sh staging validation

# Review dashboard
# URL: https://vercel.com/projects/cie/overview

# Check error log
# URL: https://sentry.io/organizations/cie/

# Update checklist
# File: DEPLOYMENT_DAILY_CHECKLIST.md (Day 1 section)
```

### Every 8 Hours: Team Sync
```
Quick standup:
- How many tests passed?
- Any issues found?
- Estimated completion?
- Need any help?

Capture in: DEPLOYMENT_DAILY_CHECKLIST.md
```

### Every 12 Hours: Performance Baseline
```bash
# Measure actual performance
# Dashboard load time: _____ ms (Target: <5ms)
# API response: _____ ms (Target: <20ms)
# WebSocket: _____ ms (Target: <100ms)
# Memory: _____ MB (Target: <600MB)
# CPU: _____ % (Target: <50%)

# Log in checklist
```

---

## **EVENING CHECK (Hour 20-24)**

### Step 17: Final Test Compilation
```bash
# Collect all test results
# Count: _____ passed, _____ failed

# If any failed:
# 1. List failures
# 2. Investigate root cause
# 3. Fix if quick (< 1 hour)
# 4. If complex: Document and plan retry

# Update checklist with results
```

### Step 18: Performance Review
```
Collected metrics:
┌─────────────────────────────────┐
│ Dashboard load:    _____ ms     │
│ API latency:       _____ ms     │
│ WebSocket:         _____ ms     │
│ Conflict res:      _____ ms     │
│ Memory usage:      _____ MB     │
│ CPU usage:         _____ %      │
│ Error rate:        _____ %      │
│ Cache hit rate:    _____ %      │
└─────────────────────────────────┘

All within targets? ☐ YES  ☐ NO
If NO, document issues.
```

### Step 19: Error Log Review
```bash
# Check Sentry
curl -s https://sentry.io/api/0/organizations/cie/issues/ \
  -H "Authorization: Bearer $SENTRY_TOKEN" | jq '.[] | .title'

# Expected: 0 critical errors
# Actual critical errors: _____

# If issues found:
# - Severity level: _____
# - Error message: _____
# - Affected feature: _____
# - Action taken: _____
```

### Step 20: Load Test (Light)
```bash
# Optional: Run lightweight load test
npm run test:load -- --users 10 --duration 5m

# Monitor:
# - Errors: _____ (Expected: 0)
# - P95 latency: _____ ms (Target: <500ms)
# - Throughput: _____ req/s
# - Result: ✅ PASS or ❌ FAIL
```

---

## **DAY 1 SIGN-OFF**

### Step 21: Complete Checklist
```bash
# Edit DEPLOYMENT_DAILY_CHECKLIST.md
# Fill in all sections:
# - Build & test results
# - Endpoint status
# - Performance metrics
# - Test results (12 test suites)
# - Error logs
# - Load test

# Verify all checkmarks ✅
```

### Step 22: Final Decision

**Question: Is staging ready for production canary?**

```
Requirements for GO:
✅ Zero critical errors (0/0)
✅ All 12 test suites passed
✅ Performance within targets
✅ Security headers present
✅ Database integrity verified
✅ Load test passed (10 users)
✅ Team consensus: YES
✅ No blocking issues

Decision: ☐ GO TO DAY 2  ☐ NEEDS FIXES
```

### Step 23: Get Sign-Off
```
Approvals needed:
1. [ ] Testing Lead: _________________ (Time: _____)
2. [ ] Engineering Lead: _________________ (Time: _____)
3. [ ] Product Manager: _________________ (Time: _____)

All signed? ☐ YES → PROCEED TO DAY 2
             ☐ NO → HOLD AND FIX ISSUES
```

---

## **TROUBLESHOOTING**

### If Deployment Fails
```
1. Check build errors:
   npm run build 2>&1 | tail -20

2. Check TypeScript:
   npx tsc --noEmit 2>&1 | head -20

3. Check environment:
   echo $DATABASE_URL
   echo $SUPABASE_URL

4. Review deployment logs:
   vercel logs --limit=50

5. Rollback and retry:
   vercel rollback
   git reset --hard HEAD~1
   npm run build
   vercel deploy --env staging
```

### If Tests Fail
```
1. Check which test failed
2. Review test output (full error)
3. Reproduce locally:
   npm run test -- --testNamePattern="failing test"
4. Debug issue
5. Fix code
6. Re-run test
7. Re-deploy to staging
```

### If Performance Issues
```
1. Check database slow queries:
   SELECT query, calls, mean_exec_time FROM pg_stat_statements 
   ORDER BY mean_exec_time DESC LIMIT 10;

2. Check cache hit rate:
   redis-cli info stats | grep hits

3. Review WebSocket connections:
   curl https://cie-staging.vercel.app/api/ws-status

4. Optimize and re-deploy
```

---

## **SUCCESS CHECKLIST**

```
☐ Build: Success
☐ Tests: All passed
☐ Lint: Zero errors
☐ TypeScript: Zero errors
☐ Deploy: Complete
☐ Health check: 200 OK
☐ All endpoints: Responding
☐ Security headers: Present
☐ Database: Verified
☐ 12 test suites: Passed
☐ Performance: Baseline set
☐ Error logs: Clean
☐ Load test: Passed
☐ Team approved: YES
☐ Ready for Day 2: YES

🎉 DAY 1 COMPLETE 🎉
```

---

## **NEXT: DAY 2 CANARY DEPLOYMENT**

Once Day 1 is signed off:
```
1. Rest/Brief team
2. Prepare Day 2 monitoring setup
3. Configure traffic splitting (25%/75%)
4. Brief on-call schedule
5. Prepare rollback procedures
6. Start Day 2 at scheduled time
```

**Day 2 timeline:**
- 00:00 → Deploy (25%)
- 02:00 → Increase (50%)
- 04:00 → Full (100%)
- 08:00 → Stabilization complete

---

**🚀 START DAY 1 NOW**

Next command to run:
```bash
git log -1 --oneline  # Verify commit
npm run build         # Start build
npm run test          # Run tests
npm run lint          # Check linting
npx tsc --noEmit      # Type check
vercel deploy --env staging  # Deploy to staging
```

Good luck! 🎉

