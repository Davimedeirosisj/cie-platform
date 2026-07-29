# Daily Deployment Checklist

---

## **DAY 1: Staging Validation (24 Hours)**

**Date:** _______________
**Time Started:** _______________
**Lead:** _______________

### Morning: Build & Test

- [ ] **Code Integrity**
  - [ ] `git status` shows no uncommitted changes
  - [ ] Latest commit: `git log -1 --oneline`
  - [ ] Branch: `main` or `master`
  - [ ] No merge conflicts

- [ ] **Build Process**
  ```bash
  npm run build
  # Result: _____ (success/failed)
  # Build time: _____ seconds
  # Build size: _____ MB
  ```

- [ ] **Testing**
  ```bash
  npm run test
  # Result: _____ passed, _____ failed
  # Coverage: _____%
  ```

- [ ] **Linting**
  ```bash
  npm run lint
  # Result: _____ errors, _____ warnings
  ```

- [ ] **TypeScript**
  ```bash
  npx tsc --noEmit
  # Result: _____ errors
  ```

### Mid-Morning: Staging Deployment

- [ ] **Deploy to Staging**
  ```bash
  vercel deploy --env staging
  # Staging URL: _____________________
  # Deployment Time: _____ seconds
  ```

- [ ] **Health Check**
  ```bash
  curl https://cie-staging.vercel.app/health
  # Response: 200 OK
  # Latency: _____ ms
  ```

- [ ] **Database Validation**
  ```sql
  SELECT COUNT(*) FROM campanhas;
  Result: _____

  SELECT COUNT(*) FROM profiles;
  Result: _____

  SELECT COUNT(*) FROM audit_log;
  Result: _____
  ```

- [ ] **Verify Security Headers**
  ```bash
  curl -I https://cie-staging.vercel.app
  - [ ] Content-Security-Policy present
  - [ ] Strict-Transport-Security present
  - [ ] X-Frame-Options: DENY
  - [ ] X-Content-Type-Options: nosniff
  ```

### Mid-Day: 24h Testing (Rotation)

**Testers:** _________________, _________________

- [ ] **Authentication**
  - [ ] Sign up new account: _____ (success/failed)
  - [ ] Login: _____ (success/failed)
  - [ ] Reset password: _____ (success/failed)
  - [ ] Session persistence: _____ (success/failed)

- [ ] **Campaign Management**
  - [ ] Create campaign: _____ (success/failed)
  - [ ] Edit campaign: _____ (success/failed)
  - [ ] Delete campaign: _____ (success/failed)
  - [ ] Campaign selection: _____ (success/failed)

- [ ] **Territory CRUD**
  - [ ] Create municipio: _____ (success/failed)
  - [ ] Edit municipio: _____ (success/failed)
  - [ ] Delete municipio: _____ (success/failed)
  - [ ] Territory hierarchy: _____ (success/failed)

- [ ] **Vote Import**
  - [ ] Upload Excel file: _____ (success/failed)
  - [ ] Parse validation: _____ (success/failed)
  - [ ] Import completion: _____ (success/failed)
  - [ ] Data consistency: _____ (success/failed)

- [ ] **Dashboard**
  - [ ] Page load: _____ ms (target: <5ms with cache)
  - [ ] KPI cards: _____ (rendering correctly)
  - [ ] Charts: _____ (displaying data)
  - [ ] Responsiveness: _____ (mobile/tablet/desktop)

- [ ] **Rankings**
  - [ ] Load rankings: _____ (success/failed)
  - [ ] Sort by votes: _____ (success/failed)
  - [ ] Filter by level: _____ (success/failed)
  - [ ] Performance: _____ ms (target: <100ms)

- [ ] **Real-time Features**
  - [ ] Presence tracking: _____ (users showing)
  - [ ] Live editing: _____ (changes syncing)
  - [ ] Conflict resolution: _____ (OT working)
  - [ ] Notifications: _____ (toasts showing)
  - [ ] Audit trail: _____ (activities logging)

### Evening: Final Verification

- [ ] **Performance Baseline**
  ```
  Dashboard load:     _____ ms (Target: <5ms)
  API latency:        _____ ms (Target: <20ms)
  WebSocket:          _____ ms (Target: <100ms)
  Conflict resolution:_____ ms (Target: <50ms)
  Memory usage:       _____ MB (Target: <600MB)
  CPU usage:          _____ % (Target: <50%)
  ```

- [ ] **Error Log Review**
  - [ ] Sentry errors: _____ (0 critical expected)
  - [ ] Browser console: _____ (clean)
  - [ ] Server logs: _____ (no errors)

- [ ] **Load Test (Light)**
  ```bash
  npm run test:load -- --users 10 --duration 5m
  # Result: _____
  # Errors: _____
  # Latency P95: _____ ms
  ```

- [ ] **Security Test**
  - [ ] Rate limiting tested: _____ (5/15min login)
  - [ ] SQL injection: _____ (protected)
  - [ ] XSS prevention: _____ (validated)
  - [ ] CSRF protection: _____ (tokens present)

### Staging Sign-Off

**Staging Status:** ☐ APPROVED  ☐ NEEDS FIXES

**Issues Found:**
1. _________________________________
2. _________________________________
3. _________________________________

**Approved By:** _______________
**Time:** _______________

---

## **DAY 2: Canary Deployment**

**Date:** _______________
**Time Started:** _______________
**Lead:** _______________

### 25% Traffic (Morning)

- [ ] **Deploy Canary (25%)**
  ```bash
  vercel deploy --prod
  # New version live
  # Configuration: Route 25% → new, 75% → old
  ```

- [ ] **Immediate Verification (0-15 min)**
  - [ ] Health endpoint: _____ OK
  - [ ] Error rate: _____ % (Target: 0%)
  - [ ] Latency P95: _____ ms (Target: <500ms)
  - [ ] WebSocket connections: _____ active

- [ ] **2-Hour Monitoring Window**
  ```
  Time    | Error % | Latency P95 | WS Conn | Memory
  --------|---------|-------------|---------|-------
  XX:00   | ___%    | _____ ms    | _____   | ____ MB
  XX:15   | ___%    | _____ ms    | _____   | ____ MB
  XX:30   | ___%    | _____ ms    | _____   | ____ MB
  XX:45   | ___%    | _____ ms    | _____   | ____ MB
  XX:00   | ___%    | _____ ms    | _____   | ____ MB
  XX:15   | ___%    | _____ ms    | _____   | ____ MB
  XX:30   | ___%    | _____ ms    | _____   | ____ MB
  XX:45   | ___%    | _____ ms    | _____   | ____ MB
  ```

- [ ] **25% Status**
  - [ ] Critical issues: ☐ NONE  ☐ FOUND → ROLLBACK
  - [ ] Approved to increase: ☐ YES  ☐ NO

**Decision:** ☐ PROCEED TO 50%  ☐ ROLLBACK

---

### 50% Traffic (Mid-Day)

- [ ] **Increase to 50%**
  ```bash
  vercel deployments
  # Verify traffic split: 50/50
  ```

- [ ] **2-Hour Monitoring Window**
  ```
  Time    | Error % | Latency P95 | WS Conn | Memory
  --------|---------|-------------|---------|-------
  XX:00   | ___%    | _____ ms    | _____   | ____ MB
  XX:15   | ___%    | _____ ms    | _____   | ____ MB
  XX:30   | ___%    | _____ ms    | _____   | ____ MB
  XX:45   | ___%    | _____ ms    | _____   | ____ MB
  XX:00   | ___%    | _____ ms    | _____   | ____ MB
  XX:15   | ___%    | _____ ms    | _____   | ____ MB
  XX:30   | ___%    | _____ ms    | _____   | ____ MB
  XX:45   | ___%    | _____ ms    | _____   | ____ MB
  ```

- [ ] **50% Status**
  - [ ] Critical issues: ☐ NONE  ☐ FOUND → ROLLBACK
  - [ ] Load balanced: ✓
  - [ ] Database stable: ✓
  - [ ] Redis working: ✓
  - [ ] Approved to go full: ☐ YES  ☐ NO

**Decision:** ☐ PROCEED TO 100%  ☐ ROLLBACK

---

### 100% Traffic (Afternoon/Evening)

- [ ] **Go Full Production**
  ```bash
  vercel deployments
  # Verify traffic: 100% on new version
  # Old version: shut down
  ```

- [ ] **Immediate Checks (0-30 min)**
  - [ ] All endpoints responding: ✓
  - [ ] No spike in errors: ✓
  - [ ] Latency stable: ✓
  - [ ] WebSocket steady: ✓

- [ ] **4-Hour Monitoring**
  ```
  Time    | Error % | Latency P95 | Connections | Requests/min
  --------|---------|-------------|-------------|-------------
  XX:00   | ___%    | _____ ms    | _____       | _____
  XX:30   | ___%    | _____ ms    | _____       | _____
  XX:00   | ___%    | _____ ms    | _____       | _____
  XX:30   | ___%    | _____ ms    | _____       | _____
  XX:00   | ___%    | _____ ms    | _____       | _____
  XX:30   | ___%    | _____ ms    | _____       | _____
  XX:00   | ___%    | _____ ms    | _____       | _____
  XX:30   | ___%    | _____ ms    | _____       | _____
  ```

- [ ] **Critical Thresholds Check**
  - [ ] Error rate > 5%: ☐ NO (if YES → ROLLBACK)
  - [ ] Latency P99 > 5000ms: ☐ NO
  - [ ] Memory > 80%: ☐ NO
  - [ ] WebSocket failures > 5%: ☐ NO
  - [ ] Message loss > 5%: ☐ NO

### Day 2 Sign-Off

**Canary Status:** ☐ SUCCESSFUL  ☐ ROLLED BACK

**If Rolled Back:**
- Root cause: _______________________
- Fix applied: _______________________
- Re-deployment scheduled: _______________

**Approved By:** _______________
**Time:** _______________

---

## **DAY 3: Production Stability**

**Date:** _______________
**Time Started:** _______________
**Lead:** _______________

### Morning: 24h Post-Deployment Check

- [ ] **Overnight Logs Review**
  - [ ] Error count: _____ (Expected: <5)
  - [ ] Critical errors: _____ (Expected: 0)
  - [ ] Warnings: _____ (Expected: <20)

- [ ] **User Reports**
  - [ ] Issues reported: ☐ NONE  ☐ SOME (List: _________)
  - [ ] Performance complaints: ☐ NONE  ☐ SOME
  - [ ] Feature requests: ☐ NONE  ☐ SOME

- [ ] **System Health**
  ```bash
  curl https://cie.app/health
  Response: 200 OK
  Latency: _____ ms

  # Database
  SELECT COUNT(*) FROM campaigns;
  Result: _____

  # Cache
  redis-cli ping
  Result: PONG
  ```

### Mid-Day: Performance Analysis

- [ ] **Actual Metrics vs Target**

  | Metric | Actual | Target | Status |
  |--------|--------|--------|--------|
  | Dashboard load | _____ ms | <5ms | ✓/✗ |
  | API latency | _____ ms | <20ms | ✓/✗ |
  | WebSocket | _____ ms | <100ms | ✓/✗ |
  | Conflict res | _____ ms | <50ms | ✓/✗ |
  | Memory | _____ MB | <600MB | ✓/✗ |
  | CPU | ____% | <50% | ✓/✗ |
  | Error rate | ____ % | <0.1% | ✓/✗ |
  | Uptime | ____% | >99.9% | ✓/✗ |

- [ ] **Cache Performance**
  - [ ] Hit rate: ____% (Target: >75%)
  - [ ] Miss rate: ____% (Target: <25%)
  - [ ] TTL optimization needed: ☐ YES  ☐ NO

- [ ] **Real-time Stats**
  - [ ] Avg WebSocket connections: _____
  - [ ] Concurrent users (peak): _____
  - [ ] Conflicts detected: _____
  - [ ] Conflict resolution time: _____ ms
  - [ ] Notification delivery rate: ____% (Target: >99%)

### Evening: Team Standup

**Attendees:** ___________________, ___________________, ___________________

- [ ] **Go/No-Go Decision**
  ```
  ☐ Production deployment SUCCESSFUL
  ☐ All success criteria met
  ☐ Monitoring active and alerting
  ☐ Team confident in stability
  ☐ Users reporting normal operations
  ```

- [ ] **Next Steps**
  - [ ] Enable automated monitoring
  - [ ] Set up daily check-ins
  - [ ] Plan optimization review (Day 7)
  - [ ] Update runbooks

### Day 3 Sign-Off

**Production Status:** ☐ APPROVED FOR OPERATIONS

**Metrics Summary:**
- Error rate: ____% (Target: <1%)
- Uptime: ____% (Target: >99.9%)
- User satisfaction: ☐ GOOD  ☐ EXCELLENT

**Approved By:** _______________
**Time:** _______________

---

## **Week 1: Daily Check-ins**

### Daily Standup Template

**Date:** _______________
**Time:** _______________
**Lead:** _______________

**Metrics Snapshot:**
```
Error Rate (24h):    ____ % 📊
Uptime (24h):        ____ % ✓
Avg Latency:         ____ ms ⚡
Active Users:        _____ 👥
Disk Usage:          ____ % 💾
```

**Issues Found:**
- ☐ None
- ☐ Minor (List): ______________________
- ☐ Critical (Escalate): ______________________

**Action Items:**
1. [ ] _________________________________
2. [ ] _________________________________
3. [ ] _________________________________

**Approved By:** _______________

---

## **Success Criteria Checklist**

- [ ] Zero critical errors in 24h
- [ ] Error rate < 1%
- [ ] Latency P95 < 500ms
- [ ] 99%+ uptime achieved
- [ ] WebSocket stable (0 dropped connections)
- [ ] Notifications >99% delivery rate
- [ ] No data loss or corruption
- [ ] Cache working (>75% hit rate)
- [ ] Team approved
- [ ] Users satisfied (no major complaints)
- [ ] All systems operational
- [ ] Monitoring active
- [ ] Runbooks updated
- [ ] Support team trained

---

## **Deployment Complete!**

**Production Live:** ✅
**Date:** _______________
**Time:** _______________

**Signed By:**
- Engineering Lead: _______________
- Product Manager: _______________
- Operations: _______________

---

**🎉 CIE Platform is now in production! 🎉**
