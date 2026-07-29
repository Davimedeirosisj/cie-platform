#!/bin/bash

# Production Deployment Monitoring Script
# Usage: ./scripts/deploy-monitor.sh <staging|canary|prod>

set -e

ENVIRONMENT=${1:-staging}
DEPLOYMENT_PHASE=${2:-validation}
INTERVAL=15  # seconds between checks

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# URLs
STAGING_URL="https://cie-staging.vercel.app"
PROD_URL="https://cie.app"

# Select URL based on environment
if [ "$ENVIRONMENT" = "staging" ]; then
  BASE_URL=$STAGING_URL
else
  BASE_URL=$PROD_URL
fi

# Thresholds
ERROR_RATE_CRITICAL=10
ERROR_RATE_WARNING=5
LATENCY_CRITICAL=5000
LATENCY_WARNING=1000
UPTIME_WARNING=99

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}CIE Platform Deployment Monitor${NC}"
echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}Phase: $DEPLOYMENT_PHASE${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function: Health Check
check_health() {
  echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} Health Check..."

  RESPONSE=$(curl -s -w "\n%{http_code}\n%{time_total}" "$BASE_URL/health")
  HTTP_CODE=$(echo "$RESPONSE" | tail -2 | head -1)
  LATENCY=$(echo "$RESPONSE" | tail -1)

  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Health: OK${NC} (${LATENCY}s)"
    return 0
  else
    echo -e "${RED}❌ Health: FAILED (HTTP $HTTP_CODE)${NC}"
    return 1
  fi
}

# Function: API Endpoints
check_endpoints() {
  echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} Checking API Endpoints..."

  ENDPOINTS=(
    "/api/health"
    "/api/campanhas"
    "/api/territorio"
    "/api/rankings"
  )

  for endpoint in "${ENDPOINTS[@]}"; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "401" ]; then
      echo -e "${GREEN}  ✅ $endpoint${NC}"
    else
      echo -e "${RED}  ❌ $endpoint (HTTP $RESPONSE)${NC}"
    fi
  done
}

# Function: WebSocket Check
check_websocket() {
  echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} Checking WebSocket..."

  RESPONSE=$(curl -s -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
    "$BASE_URL/api/ws" 2>&1 | head -1)

  if echo "$RESPONSE" | grep -q "101\|Connection: Upgrade"; then
    echo -e "${GREEN}✅ WebSocket: Connected${NC}"
  else
    echo -e "${RED}❌ WebSocket: Failed${NC}"
  fi
}

# Function: Database Check
check_database() {
  echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} Checking Database..."

  # Note: This requires direct database access
  # Run via: psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1"

  echo -e "${YELLOW}⚠️  Database: Manual verification needed${NC}"
  echo "  Run: psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -c \"SELECT 1\""
}

# Function: Performance Metrics
check_performance() {
  echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} Performance Check..."

  # Dashboard load test
  START=$(date +%s%N)
  curl -s "$BASE_URL/dashboard" > /dev/null
  END=$(date +%s%N)
  LATENCY_MS=$(( (END - START) / 1000000 ))

  if [ $LATENCY_MS -lt 500 ]; then
    echo -e "${GREEN}✅ Dashboard: ${LATENCY_MS}ms${NC}"
  elif [ $LATENCY_MS -lt 2000 ]; then
    echo -e "${YELLOW}⚠️  Dashboard: ${LATENCY_MS}ms (warning)${NC}"
  else
    echo -e "${RED}❌ Dashboard: ${LATENCY_MS}ms (critical)${NC}"
  fi
}

# Function: Error Tracking
check_errors() {
  echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} Error Tracking..."

  # This would pull from Sentry/logging service
  echo -e "${YELLOW}⚠️  Errors: Check Sentry dashboard${NC}"
  echo "  URL: https://sentry.io/organizations/cie/issues/"
}

# Function: Cache Status
check_cache() {
  echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} Cache Status..."

  # This would check Redis cache stats
  echo -e "${YELLOW}⚠️  Cache: Check Redis metrics${NC}"
  echo "  Command: redis-cli info stats"
}

# Function: Summary Report
summary_report() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}Deployment Status Summary${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""

  # Count checks
  CHECKS_PASSED=0
  CHECKS_FAILED=0
  CHECKS_WARNING=0

  echo "Current Time: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Environment: $ENVIRONMENT"
  echo "URL: $BASE_URL"
  echo ""

  echo "Next Check: In ${INTERVAL}s"
  echo "Press Ctrl+C to stop monitoring"
  echo ""
}

# Function: Continuous Monitoring
monitor_loop() {
  ITERATION=0

  while true; do
    ITERATION=$((ITERATION + 1))

    echo ""
    echo -e "${BLUE}=== ITERATION $ITERATION - $(date '+%H:%M:%S') ===${NC}"
    echo ""

    check_health
    check_endpoints
    check_websocket
    check_performance
    check_errors
    check_cache

    summary_report

    # Sleep until next check
    sleep $INTERVAL
  done
}

# Main execution
case $DEPLOYMENT_PHASE in
  validation)
    echo "Running single validation check..."
    check_health
    check_endpoints
    check_websocket
    check_database
    check_performance
    ;;

  monitoring)
    echo "Starting continuous monitoring..."
    echo "Interval: ${INTERVAL}s"
    echo "Stop with: Ctrl+C"
    monitor_loop
    ;;

  *)
    echo "Usage: $0 <staging|canary|prod> <validation|monitoring>"
    echo ""
    echo "Examples:"
    echo "  $0 staging validation      # Single check before deploy"
    echo "  $0 prod monitoring         # Continuous monitoring"
    exit 1
    ;;
esac
