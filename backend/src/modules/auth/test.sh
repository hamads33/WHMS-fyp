#!/bin/bash

################################################################################
# AUTH MODULE TESTING SCRIPT - SIMPLIFIED VERSION
# Tests all routes in the authentication module
# Usage: ./test.sh
################################################################################

# Configuration
BASE_URL="http://localhost:4000/api"
SUPERADMIN_EMAIL="superadmin@example.com"
SUPERADMIN_PASS="SuperAdmin123!"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPass123!"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
PASS=0
FAIL=0
TOTAL=0

# Storage for tokens
ACCESS_TOKEN=""
REFRESH_TOKEN=""
USER_ID=""
SUPERADMIN_TOKEN=""
SUPERADMIN_ID=""
SESSION_ID=""
API_KEY_ID=""
DEVICE_ID=""

################################################################################
# UTILITY FUNCTIONS
################################################################################

log_header() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}════════════════════════════════════════════${NC}"
    echo ""
}

log_test() {
    echo -e "${BLUE}➜ $1${NC}"
}

log_pass() {
    echo -e "${GREEN}✓ PASS${NC} - $1"
    ((PASS++))
    ((TOTAL++))
}

log_fail() {
    echo -e "${RED}✗ FAIL${NC} - $1"
    ((FAIL++))
    ((TOTAL++))
}

log_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

show_response() {
    local response="$1"
    local max_lines=8
    
    echo "$response" | head -n $max_lines
    
    local lines=$(echo "$response" | wc -l)
    if [ $lines -gt $max_lines ]; then
        echo "... (showing first $max_lines of $lines lines)"
    fi
    echo ""
}

################################################################################
# MAIN TEST EXECUTION
################################################################################

log_header "🔐 AUTH MODULE TEST SUITE"
log_info "Backend: $BASE_URL"
log_info "Superadmin: $SUPERADMIN_EMAIL"
log_info "Test User: $TEST_EMAIL"

################################################################################
# 1. AUTHENTICATION
################################################################################

log_header "1️⃣  AUTHENTICATION TESTS"

# Superadmin Login
log_test "Login as Superadmin"
SUPERADMIN_LOGIN=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$SUPERADMIN_EMAIL\",\"password\":\"$SUPERADMIN_PASS\"}" \
    $BASE_URL/auth/login)

SUPERADMIN_TOKEN=$(echo "$SUPERADMIN_LOGIN" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4 | head -1)
SUPERADMIN_ID=$(echo "$SUPERADMIN_LOGIN" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -n "$SUPERADMIN_TOKEN" ]; then
    log_pass "Superadmin logged in successfully"
    log_info "  ID: $SUPERADMIN_ID"
else
    log_fail "Superadmin login failed"
    show_response "$SUPERADMIN_LOGIN"
fi
echo ""

# Register Test User
log_test "Register new test user (role: client auto-assigned)"
REG_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    $BASE_URL/auth/register)

USER_ID=$(echo "$REG_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -n "$USER_ID" ]; then
    log_pass "Test user registered"
    log_info "  ID: $USER_ID"
    log_info "  Email: $TEST_EMAIL"
    log_info "  Auto-assigned role: client"
else
    log_fail "User registration failed"
    show_response "$REG_RESPONSE"
fi
echo ""

# Login Test User
log_test "Login with test user"
LOGIN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    $BASE_URL/auth/login)

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4 | head -1)
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -n "$ACCESS_TOKEN" ]; then
    log_pass "Test user logged in successfully"
    log_info "  Access Token obtained (length: ${#ACCESS_TOKEN})"
else
    log_fail "Test user login failed"
    show_response "$LOGIN_RESPONSE"
fi
echo ""

# Get Current User
log_test "Get current user profile (/auth/me)"
ME_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    $BASE_URL/auth/me)

if echo "$ME_RESPONSE" | grep -q "$TEST_EMAIL"; then
    log_pass "Retrieved user profile successfully"
    show_response "$ME_RESPONSE"
else
    log_fail "Failed to get user profile"
    show_response "$ME_RESPONSE"
fi
echo ""

# Refresh Token
log_test "Refresh access token"
REFRESH_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" \
    $BASE_URL/auth/refresh)

NEW_TOKEN=$(echo "$REFRESH_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -n "$NEW_TOKEN" ]; then
    log_pass "Token refreshed successfully"
    ACCESS_TOKEN=$NEW_TOKEN
else
    log_fail "Token refresh failed"
    show_response "$REFRESH_RESPONSE"
fi
echo ""

################################################################################
# 2. EMAIL VERIFICATION
################################################################################

log_header "2️⃣  EMAIL VERIFICATION TESTS"

# Send Verification Email (Authenticated)
log_test "Send verification email (authenticated user)"
VERIFY_EMAIL=$(curl -s -X POST \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{}" \
    $BASE_URL/auth/email/send-verification)

if echo "$VERIFY_EMAIL" | grep -q "success"; then
    log_pass "Verification email sent to authenticated user"
else
    log_fail "Failed to send verification email"
    show_response "$VERIFY_EMAIL"
fi
echo ""

# Send Verification Email (Public)
log_test "Send verification email (public route)"
PUBLIC_VERIFY=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"origin\":\"http://localhost:3000\"}" \
    $BASE_URL/auth/email/send)

if echo "$PUBLIC_VERIFY" | grep -q "success"; then
    log_pass "Verification email sent via public route"
else
    log_fail "Failed to send verification email (public)"
    show_response "$PUBLIC_VERIFY"
fi
echo ""

################################################################################
# 3. PASSWORD RESET
################################################################################

log_header "3️⃣  PASSWORD RESET TESTS"

# Request Password Reset
log_test "Request password reset email"
RESET_REQ=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"origin\":\"http://localhost:3000\"}" \
    $BASE_URL/auth/password/request-reset)

if echo "$RESET_REQ" | grep -q "success"; then
    log_pass "Password reset email sent"
else
    log_fail "Failed to send password reset email"
    show_response "$RESET_REQ"
fi
echo ""

################################################################################
# 4. SESSION MANAGEMENT
################################################################################

log_header "4️⃣  SESSION MANAGEMENT TESTS"

# Get Current Session Context
log_test "Get current session context"
CURRENT_SESSION=$(curl -s -X GET \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    $BASE_URL/auth/session/current)

if echo "$CURRENT_SESSION" | grep -q "portal"; then
    log_pass "Retrieved session context"
    show_response "$CURRENT_SESSION"
else
    log_fail "Failed to get session context"
    show_response "$CURRENT_SESSION"
fi
echo ""

# List Sessions
log_test "List active sessions"
SESSIONS_LIST=$(curl -s -X GET \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    $BASE_URL/auth/session)

SESSION_ID=$(echo "$SESSIONS_LIST" | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if echo "$SESSIONS_LIST" | grep -q "sessions"; then
    log_pass "Retrieved sessions list"
    log_info "  Found ${#SESSION_ID} session(s)"
    show_response "$SESSIONS_LIST"
else
    log_fail "Failed to get sessions list"
    show_response "$SESSIONS_LIST"
fi
echo ""

# Security Logs
log_test "Get security logs"
SECURITY_LOGS=$(curl -s -X GET \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    $BASE_URL/auth/session/security/logs)

if echo "$SECURITY_LOGS" | grep -q "logs"; then
    log_pass "Retrieved security logs"
    show_response "$SECURITY_LOGS"
else
    log_fail "Failed to get security logs"
    show_response "$SECURITY_LOGS"
fi
echo ""

################################################################################
# 5. MFA TESTS
################################################################################

log_header "5️⃣  MFA (MULTI-FACTOR AUTHENTICATION) TESTS"

# Setup MFA
log_test "Setup MFA - Generate secret and QR code"
MFA_SETUP=$(curl -s -X POST \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    $BASE_URL/auth/mfa/setup)

MFA_SECRET=$(echo "$MFA_SETUP" | grep -o '"secret":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -n "$MFA_SECRET" ]; then
    log_pass "MFA setup successful"
    log_info "  Secret (first 10 chars): ${MFA_SECRET:0:10}..."
    log_info "  ⚠️  To enable MFA, scan QR with authenticator and verify with TOTP code"
else
    log_fail "MFA setup failed"
    show_response "$MFA_SETUP"
fi
echo ""

################################################################################
# 6. TRUSTED DEVICES
################################################################################

log_header "6️⃣  TRUSTED DEVICE TESTS"

# Create Trusted Device
log_test "Create trusted device"
DEVICE_CREATE=$(curl -s -X POST \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Test Device\"}" \
    $BASE_URL/auth/trusted-devices)

DEVICE_ID=$(echo "$DEVICE_CREATE" | grep -o '"deviceId":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -n "$DEVICE_ID" ]; then
    log_pass "Trusted device created"
    log_info "  Device ID: ${DEVICE_ID:0:10}..."
else
    log_fail "Failed to create trusted device"
    show_response "$DEVICE_CREATE"
fi
echo ""

# List Trusted Devices
log_test "List trusted devices"
DEVICES_LIST=$(curl -s -X GET \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    $BASE_URL/auth/trusted-devices)

if echo "$DEVICES_LIST" | grep -q "devices"; then
    log_pass "Retrieved trusted devices list"
    show_response "$DEVICES_LIST"
else
    log_fail "Failed to get trusted devices"
    show_response "$DEVICES_LIST"
fi
echo ""

################################################################################
# 7. API KEYS
################################################################################

log_header "7️⃣  API KEY MANAGEMENT TESTS"

# Create API Key
log_test "Create API key"
API_KEY_CREATE=$(curl -s -X POST \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Test Key\",\"scopes\":[\"read\"],\"expiresInDays\":30}" \
    $BASE_URL/auth/api-keys)

API_KEY_ID=$(echo "$API_KEY_CREATE" | grep -o '"apiKeyId":"[^"]*' | cut -d'"' -f4 | head -1)

if [ -n "$API_KEY_ID" ]; then
    log_pass "API key created"
    log_info "  API Key ID: ${API_KEY_ID:0:10}..."
    show_response "$API_KEY_CREATE"
else
    log_fail "Failed to create API key"
    show_response "$API_KEY_CREATE"
fi
echo ""

# List API Keys
log_test "List API keys"
API_KEYS_LIST=$(curl -s -X GET \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    $BASE_URL/auth/api-keys)

if echo "$API_KEYS_LIST" | grep -q "keys"; then
    log_pass "Retrieved API keys list"
    show_response "$API_KEYS_LIST"
else
    log_fail "Failed to get API keys"
    show_response "$API_KEYS_LIST"
fi
echo ""

################################################################################
# 8. ADMIN OPERATIONS
################################################################################

log_header "8️⃣  ADMIN USER MANAGEMENT TESTS"

if [ -z "$SUPERADMIN_TOKEN" ]; then
    log_fail "Superadmin token missing - skipping admin tests"
    echo ""
else
    # List Users
    log_test "List users (admin)"
    USERS_LIST=$(curl -s -X GET \
        -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
        "$BASE_URL/auth/admin/users?limit=5")
    
    if echo "$USERS_LIST" | grep -q "users"; then
        log_pass "Retrieved users list"
        show_response "$USERS_LIST"
    else
        log_fail "Failed to get users list"
        show_response "$USERS_LIST"
    fi
    echo ""
    
    # User Stats
    log_test "Get user statistics"
    USER_STATS=$(curl -s -X GET \
        -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
        $BASE_URL/auth/admin/users/stats)
    
    if echo "$USER_STATS" | grep -q "total"; then
        log_pass "Retrieved user statistics"
        show_response "$USER_STATS"
    else
        log_fail "Failed to get user statistics"
        show_response "$USER_STATS"
    fi
    echo ""
    
    # List Roles
    log_test "List all roles and permissions"
    ROLES_LIST=$(curl -s -X GET \
        -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
        $BASE_URL/auth/admin/users/roles)
    
    if echo "$ROLES_LIST" | grep -q "roles"; then
        log_pass "Retrieved roles list"
        show_response "$ROLES_LIST"
    else
        log_fail "Failed to get roles list"
        show_response "$ROLES_LIST"
    fi
    echo ""
    
    # Update User Roles
    log_test "Update user roles (add reseller role)"
    UPDATE_ROLES=$(curl -s -X POST \
        -H "Authorization: Bearer $SUPERADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"roles\":[\"client\",\"reseller\"]}" \
        $BASE_URL/auth/admin/users/$USER_ID/roles)
    
    if echo "$UPDATE_ROLES" | grep -q "success"; then
        log_pass "User roles updated successfully"
        show_response "$UPDATE_ROLES"
    else
        log_fail "Failed to update user roles"
        show_response "$UPDATE_ROLES"
    fi
    echo ""
fi

################################################################################
# 9. LOGOUT
################################################################################

log_header "9️⃣  LOGOUT TEST"

log_test "Logout user (invalidate refresh token)"
LOGOUT=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" \
    $BASE_URL/auth/logout)

if echo "$LOGOUT" | grep -q "success"; then
    log_pass "User logged out successfully"
    show_response "$LOGOUT"
else
    log_fail "Logout may have failed"
    show_response "$LOGOUT"
fi
echo ""

################################################################################
# FINAL SUMMARY
################################################################################

log_header "📊 TEST SUMMARY"

TOTAL_TESTS=$((PASS + FAIL))
if [ $TOTAL_TESTS -gt 0 ]; then
    PERCENTAGE=$((PASS * 100 / TOTAL_TESTS))
else
    PERCENTAGE=0
fi

echo -e "${GREEN}✓ Passed: $PASS${NC}"
echo -e "${RED}✗ Failed: $FAIL${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Total: $TOTAL_TESTS${NC}"
echo -e "${CYAN}Success Rate: $PERCENTAGE%${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}╔══════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ ALL TESTS PASSED! 🎉          ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════╝${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}╔══════════════════════════════════╗${NC}"
    echo -e "${RED}║  ⚠️  SOME TESTS FAILED           ║${NC}"
    echo -e "${RED}╚══════════════════════════════════╝${NC}"
    echo ""
    exit 1
fi