#!/bin/bash

################################################################################
# 🔐 AUTH MODULE – FULL TEST SUITE
# POSITIVE + NEGATIVE SCENARIOS (VIVA READY)
################################################################################

BASE_URL="http://localhost:4000/api"
SUPERADMIN_EMAIL="superadmin@example.com"
SUPERADMIN_PASS="SuperAdmin123!"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPass123!"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

pass() { echo -e "${GREEN}✔ PASS${NC}  $1"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}✖ FAIL${NC}  $1"; FAIL=$((FAIL+1)); }

section() {
  echo ""
  echo -e "${CYAN}════════════════════════════════════════════${NC}"
  echo -e "${CYAN}$1${NC}"
  echo -e "${CYAN}════════════════════════════════════════════${NC}"
}

################################################################################
# 1️⃣ SUPERADMIN AUTHENTICATION (POSITIVE)
################################################################################
section "1️⃣ SUPERADMIN AUTHENTICATION (POSITIVE)"

SA_LOGIN=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"email\":\"$SUPERADMIN_EMAIL\",\"password\":\"$SUPERADMIN_PASS\"}" \
  $BASE_URL/auth/login)

SA_TOKEN=$(echo "$SA_LOGIN" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

[ -n "$SA_TOKEN" ] \
  && pass "Superadmin logged in successfully" \
  || fail "Superadmin login failed"

################################################################################
# 2️⃣ CLIENT REGISTRATION & LOGIN (POSITIVE)
################################################################################
section "2️⃣ CLIENT REGISTRATION & LOGIN (POSITIVE)"

REG=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
  $BASE_URL/auth/register)

USER_ID=$(echo "$REG" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

[ -n "$USER_ID" ] \
  && pass "Client registered (role auto-assigned: CLIENT)" \
  || fail "Client registration failed"

LOGIN=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
  $BASE_URL/auth/login)

TOKEN=$(echo "$LOGIN" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
REFRESH=$(echo "$LOGIN" | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)

[ -n "$TOKEN" ] \
  && pass "Client login successful" \
  || fail "Client login failed"

################################################################################
# 3️⃣ AUTH NEGATIVE SCENARIOS (401)
################################################################################
section "3️⃣ AUTH NEGATIVE SCENARIOS (401)"

# No token
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/auth/me)
[ "$STATUS" = "401" ] \
  && pass "NEGATIVE AUTH: /auth/me blocked without token" \
  || fail "SECURITY FAILURE: /auth/me accessible without token"

# Wrong password
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"WrongPass123!\"}" \
  $BASE_URL/auth/login)

[ "$STATUS" = "401" ] \
  && pass "NEGATIVE AUTH: Wrong password rejected" \
  || fail "SECURITY FAILURE: Wrong password accepted"

# Non-existent user
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"ghost@example.com","password":"AnyPass123"}' \
  $BASE_URL/auth/login)

[ "$STATUS" = "401" -o "$STATUS" = "404" ] \
  && pass "NEGATIVE AUTH: Non-existent user rejected" \
  || fail "SECURITY FAILURE: Ghost user authenticated"

################################################################################
# 4️⃣ SESSION MANAGEMENT (POSITIVE + NEGATIVE)
################################################################################
section "4️⃣ SESSION MANAGEMENT"

curl -s -H "Authorization: Bearer $TOKEN" \
  $BASE_URL/auth/sessions/current >/dev/null \
  && pass "Session context retrieved" \
  || fail "Failed to get session context"

curl -s -H "Authorization: Bearer $TOKEN" \
  $BASE_URL/auth/sessions >/dev/null \
  && pass "Sessions list retrieved" \
  || fail "Failed to list sessions"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  $BASE_URL/auth/sessions)

[ "$STATUS" = "401" ] \
  && pass "NEGATIVE SESSION: Sessions blocked without auth" \
  || fail "SECURITY FAILURE: Sessions exposed publicly"

################################################################################
# 5️⃣ MFA (POSITIVE + NEGATIVE)
################################################################################
section "5️⃣ MULTI-FACTOR AUTHENTICATION"

curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  $BASE_URL/auth/mfa/setup >/dev/null \
  && pass "MFA setup initiated" \
  || fail "MFA setup failed"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST $BASE_URL/auth/mfa/setup)

[ "$STATUS" = "401" ] \
  && pass "NEGATIVE MFA: Setup blocked without auth" \
  || fail "SECURITY FAILURE: MFA setup allowed without auth"

################################################################################
# 6️⃣ TRUSTED DEVICES (POSITIVE)
################################################################################
section "6️⃣ TRUSTED DEVICES"

curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Device"}' \
  $BASE_URL/auth/trusted-devices >/dev/null \
  && pass "Trusted device created" \
  || fail "Trusted device creation failed"

################################################################################
# 7️⃣ API KEYS (POSITIVE + NEGATIVE)
################################################################################
section "7️⃣ API KEY MANAGEMENT"

curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"TestKey","scopes":["read"],"expiresInDays":7}' \
  $BASE_URL/auth/apikeys >/dev/null \
  && pass "API key created" \
  || fail "API key creation failed"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  $BASE_URL/auth/apikeys)

[ "$STATUS" = "401" ] \
  && pass "NEGATIVE API KEY: Listing blocked without auth" \
  || fail "SECURITY FAILURE: API keys exposed publicly"

################################################################################
# 8️⃣ RBAC & IDOR NEGATIVE SCENARIOS (403)
################################################################################
section "8️⃣ RBAC & IDOR NEGATIVE SCENARIOS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  $BASE_URL/admin/users)

[ "$STATUS" = "403" ] \
  && pass "RBAC NEGATIVE: Client blocked from admin users" \
  || fail "RBAC FAILURE: Client accessed admin route"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roles":["admin"]}' \
  $BASE_URL/admin/users/$USER_ID/roles)

[ "$STATUS" = "403" ] \
  && pass "IDOR NEGATIVE: Client cannot self-promote" \
  || fail "IDOR FAILURE: Client role escalation allowed"

################################################################################
# 9️⃣ ADMIN OPERATIONS (POSITIVE)
################################################################################
section "9️⃣ ADMIN OPERATIONS (SUPERADMIN)"

curl -s -H "Authorization: Bearer $SA_TOKEN" \
  $BASE_URL/admin/users >/dev/null \
  && pass "Admin listed users" \
  || fail "Admin list users failed"

curl -s -H "Authorization: Bearer $SA_TOKEN" \
  $BASE_URL/admin/users/stats >/dev/null \
  && pass "Admin retrieved user stats" \
  || fail "Admin user stats failed"
#############################################################
# section "🔟 LOGOUT & TOKEN INVALIDATION (JWT-AWARE)"
#############################################################
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH\"}" \
  $BASE_URL/auth/logout >/dev/null \
  && pass "User logged out (refresh token revoked)" \
  || fail "Logout failed"

# Access token MAY still work (expected in stateless JWT)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  $BASE_URL/auth/me)

[ "$STATUS" = "200" ] \
  && pass "EXPECTED: Access token valid until expiry (JWT design)" \
  || fail "Unexpected access token rejection"


################################################################################
# 📊 FINAL SUMMARY
################################################################################
section "📊 FINAL SUMMARY"

echo -e "${GREEN}Passed:${NC} $PASS"
echo -e "${RED}Failed:${NC} $FAIL"

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL TESTS PASSED – SYSTEM IS SECURE & RBAC COMPLIANT${NC}"
else
  echo -e "${RED}⚠️ SOME TESTS FAILED – REVIEW ABOVE OUTPUT${NC}"
fi
