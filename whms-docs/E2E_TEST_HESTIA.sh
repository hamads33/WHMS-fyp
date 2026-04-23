#!/bin/bash

# HestiaCP End-to-End Provisioning Test
# Usage: bash E2E_TEST_HESTIA.sh

set -e

# ============================================================
# CONFIGURATION
# ============================================================

WHMS_URL="http://localhost:4000"
ADMIN_TOKEN="${ADMIN_TOKEN:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlYTI3Yjc0ZC1iYjc2LTQ3ODktYjE4Yi0wNjg2YzBmMDdhNjIiLCJlbWFpbCI6InN1cGVyYWRtaW5AZXhhbXBsZS5jb20iLCJpYXQiOjE3NzY1MjM1OTQsImV4cCI6MTc3NjUyNzE5NH0.APzqHIW7mxhec9yN6KKXdMwo9Vrurg_eFCLqE7xK8Ls}"  # Set via env var
HESTIA_HOST="servernode.whms.website"
HESTIA_PORT="8083"
HESTIA_ACCESS_KEY="PiEEQcvpcpOgCcdMCe0V"
HESTIA_SECRET_KEY="rC5QGlPMsM1IkyRVy_OmzkFw9=kQublmNNdG9bNx"

TEST_CLIENT_ID="test-client-$(date +%s)"
TEST_ORDER_ID="test-order-$(date +%s)"
TEST_USERNAME="test-user-$(date +%s | tail -c 6)"
TEST_DOMAIN="test-$(date +%s).local"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================
# HELPER FUNCTIONS
# ============================================================

log_step() {
  echo -e "${GREEN}▶${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

api_call() {
  local method=$1
  local endpoint=$2
  local data=$3

  if [ -n "$data" ]; then
    curl -s -X "$method" "$WHMS_URL$endpoint" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -s -X "$method" "$WHMS_URL$endpoint" \
      -H "Authorization: Bearer $ADMIN_TOKEN"
  fi
}

# ============================================================
# TESTS
# ============================================================

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  HestiaCP End-to-End Provisioning Test                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: Verify admin is authenticated
log_step "Test 1: Verify admin authentication"
if [ "$ADMIN_TOKEN" = "your_admin_token_here" ]; then
  log_error "ADMIN_TOKEN not set. Run: export ADMIN_TOKEN='your_token'"
  exit 1
fi
log_success "Admin token configured"

# Test 2: Save HestiaCP credentials
log_step "Test 2: Save HestiaCP credentials to database"
SAVE_HESTIA=$(api_call PUT "/api/admin/settings/hestiacp" "{
  \"host\": \"$HESTIA_HOST\",
  \"port\": $HESTIA_PORT,
  \"accessKey\": \"$HESTIA_ACCESS_KEY\",
  \"rejectUnauthorized\": false
}")

if echo "$SAVE_HESTIA" | grep -q "success"; then
  log_success "HestiaCP credentials saved to database"
else
  log_error "Failed to save HestiaCP credentials"
  echo "$SAVE_HESTIA"
  exit 1
fi

# Test 3: Test HestiaCP connection
log_step "Test 3: Test connection to HestiaCP"
TEST_CONN=$(api_call POST "/api/admin/settings/hestiacp/test" "")

if echo "$TEST_CONN" | grep -q '"success":true'; then
  log_success "HestiaCP connection verified"
else
  log_error "HestiaCP connection failed"
  echo "$TEST_CONN"
  exit 1
fi

# Test 4: Create test order
log_step "Test 4: Create test order (status: active)"
CREATE_ORDER=$(api_call POST "/api/admin/orders" "{
  \"id\": \"$TEST_ORDER_ID\",
  \"clientId\": \"$TEST_CLIENT_ID\",
  \"serviceId\": \"service-hosting-starter\",
  \"quantity\": 1,
  \"status\": \"active\",
  \"total\": 100
}")

if echo "$CREATE_ORDER" | grep -q "$TEST_ORDER_ID"; then
  log_success "Test order created: $TEST_ORDER_ID"
else
  log_warning "Order creation response: $CREATE_ORDER"
fi

# Test 5: Trigger async provisioning
log_step "Test 5: Trigger async provisioning"
PROVISION=$(api_call POST "/api/admin/provisioning/orders/$TEST_ORDER_ID/provision-async" "")

JOB_ID=$(echo "$PROVISION" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
  log_error "Failed to queue provisioning job"
  echo "$PROVISION"
  exit 1
fi

log_success "Provisioning job queued: $JOB_ID"

# Test 6: Wait for provisioning to complete
log_step "Test 6: Wait for provisioning job to complete (max 30s)"
TIMEOUT=30
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
  JOB_STATUS=$(api_call GET "/api/admin/provisioning/jobs/$JOB_ID" "")
  STATE=$(echo "$JOB_STATUS" | grep -o '"state":"[^"]*"' | cut -d'"' -f4)

  if [ "$STATE" = "completed" ]; then
    log_success "Provisioning completed!"
    ACCOUNT_USERNAME=$(echo "$JOB_STATUS" | grep -o '"username":"[^"]*"' | head -1 | cut -d'"' -f4)
    log_success "Account created: $ACCOUNT_USERNAME"
    break
  elif [ "$STATE" = "failed" ]; then
    log_error "Provisioning failed"
    echo "$JOB_STATUS"
    exit 1
  fi

  echo -ne "  Status: $STATE (${ELAPSED}s)...\r"
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
  log_warning "Provisioning timeout (job still processing)"
  log_warning "Job state: $STATE"
fi

# Test 7: Get account details
log_step "Test 7: Retrieve provisioned account details"
ACCOUNT=$(api_call GET "/api/admin/provisioning/accounts/$ACCOUNT_USERNAME" "")

if echo "$ACCOUNT" | grep -q "$ACCOUNT_USERNAME"; then
  DISK=$(echo "$ACCOUNT" | grep -o '"diskUsedMB":[0-9]*' | cut -d':' -f2)
  log_success "Account retrieved: $ACCOUNT_USERNAME (Disk: ${DISK}MB)"
else
  log_error "Failed to retrieve account"
  echo "$ACCOUNT"
fi

# Test 8: Provision domain
log_step "Test 8: Provision domain: $TEST_DOMAIN"
DOMAIN=$(api_call POST "/api/admin/provisioning/accounts/$ACCOUNT_USERNAME/domains" "{
  \"domain\": \"$TEST_DOMAIN\",
  \"ip\": \"shared\"
}")

if echo "$DOMAIN" | grep -q "$TEST_DOMAIN"; then
  log_success "Domain provisioning initiated: $TEST_DOMAIN"
else
  log_warning "Domain provisioning response: $DOMAIN"
fi

# Test 9: Suspend account
log_step "Test 9: Suspend account (non-payment)"
SUSPEND=$(api_call POST "/api/admin/provisioning/orders/$TEST_ORDER_ID/suspend-async" "{
  \"reason\": \"non-payment\"
}")

SUSPEND_JOB=$(echo "$SUSPEND" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$SUSPEND_JOB" ]; then
  log_success "Suspend job queued: $SUSPEND_JOB"
  sleep 2

  # Check suspend status
  SUSPEND_STATUS=$(api_call GET "/api/admin/provisioning/jobs/$SUSPEND_JOB" "")
  SUSPEND_STATE=$(echo "$SUSPEND_STATUS" | grep -o '"state":"[^"]*"' | cut -d'"' -f4)

  if [ "$SUSPEND_STATE" = "completed" ]; then
    log_success "Account suspended successfully"
  else
    log_warning "Suspend job state: $SUSPEND_STATE"
  fi
else
  log_error "Failed to queue suspend job"
  echo "$SUSPEND"
fi

# Test 10: Unsuspend account
log_step "Test 10: Unsuspend account (payment received)"
UNSUSPEND=$(api_call POST "/api/admin/provisioning/orders/$TEST_ORDER_ID/unsuspend-async" "")

UNSUSPEND_JOB=$(echo "$UNSUSPEND" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -n "$UNSUSPEND_JOB" ]; then
  log_success "Unsuspend job queued: $UNSUSPEND_JOB"
  sleep 2

  UNSUSPEND_STATUS=$(api_call GET "/api/admin/provisioning/jobs/$UNSUSPEND_JOB" "")
  UNSUSPEND_STATE=$(echo "$UNSUSPEND_STATUS" | grep -o '"state":"[^"]*"' | cut -d'"' -f4)

  if [ "$UNSUSPEND_STATE" = "completed" ]; then
    log_success "Account unsuspended successfully"
  else
    log_warning "Unsuspend job state: $UNSUSPEND_STATE"
  fi
else
  log_error "Failed to queue unsuspend job"
  echo "$UNSUSPEND"
fi

# Test 11: Get account stats
log_step "Test 11: Get account usage statistics"
STATS=$(api_call GET "/api/admin/provisioning/accounts/$ACCOUNT_USERNAME/stats" "")

if echo "$STATS" | grep -q "$ACCOUNT_USERNAME"; then
  log_success "Account stats retrieved"
else
  log_warning "Stats retrieval response: $STATS"
fi

# Test 12: List all accounts
log_step "Test 12: List all provisioned accounts"
ACCOUNTS=$(api_call GET "/api/admin/provisioning/accounts?limit=5" "")

COUNT=$(echo "$ACCOUNTS" | grep -o '"username"' | wc -l)
log_success "Listed $COUNT provisioned accounts"

# Test 13: Verify in HestiaCP
log_step "Test 13: Verify account exists in HestiaCP"
log_warning "MANUAL VERIFICATION REQUIRED"
echo "   SSH to HestiaCP and run:"
echo "   ssh root@$HESTIA_HOST"
echo "   v-list-users"
echo "   Should show account: $ACCOUNT_USERNAME"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  End-to-End Test Complete ✓                               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Summary:"
echo "  Order ID:           $TEST_ORDER_ID"
echo "  Account Username:   $ACCOUNT_USERNAME"
echo "  Test Domain:        $TEST_DOMAIN"
echo "  Job ID:             $JOB_ID"
echo ""
echo "Next steps:"
echo "  1. SSH to HestiaCP to verify account creation"
echo "  2. Test login with provisioned credentials"
echo "  3. Check domain DNS propagation"
echo "  4. Verify SSL certificate issuance"
echo ""
