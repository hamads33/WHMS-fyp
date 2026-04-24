# CyberPanel Provisioning System - Complete Migration

## ✅ Conversion Complete: HestiaCP/VestaCP → CyberPanel

All hosting provisioning has been converted from dual HestiaCP/VestaCP system to unified **CyberPanel** integration.

---

## 📋 What Was Changed

### Files Created
- ✅ `src/modules/provisioning/drivers/cyberpanel.driver.js` - New CyberPanel API driver
- ✅ `E2E_TEST_CYBERPANEL.sh` - End-to-end test script for CyberPanel
- ✅ `CYBERPANEL_MIGRATION.md` - This file

### Files Updated

#### Settings Module
- **settings.service.js** - Replaced VestaCP/HestiaCP helpers with CyberPanel
  - `getCyberPanelCredentials()` - Get CyberPanel config from DB
  - `setCyberPanelCredentials()` - Store CyberPanel config in DB
  - `testCyberPanelConnection()` - Verify API connectivity

- **settings.controller.js** - Updated endpoints to CyberPanel
  - `GET /api/admin/settings/cyberpanel` - Fetch credentials (masked)
  - `PUT /api/admin/settings/cyberpanel` - Save credentials
  - `POST /api/admin/settings/cyberpanel/test` - Test connection

- **settings.routes.js** - Updated route mappings
  - Removed HestiaCP routes (`/settings/hestiacp`, `/settings/vestacp`)
  - Added CyberPanel routes (`/settings/cyberpanel`)

#### Provisioning Module
- **provisioning.service.js** - Simplified to use only CyberPanel
  - Removed `_getHestiaDriver()`
  - Removed `_getVestacpDriver()`
  - Added `_getCyberPanelDriver()`
  - Simplified `_getDriver()` to return CyberPanel driver

---

## 🎯 CyberPanel API Integration

### Authentication
- **Method**: Bearer Token (API Token)
- **Header**: `Authorization: Bearer {apiToken}`
- **Port**: 8090 (default, supports both HTTP and HTTPS)

### Driver Implementation

**File**: `src/modules/provisioning/drivers/cyberpanel.driver.js`

**Features**:
- ✅ REST API integration with CyberPanel 2.0+
- ✅ Bearer token authentication
- ✅ Automatic HTTP/HTTPS detection
- ✅ Request timeout handling (30 seconds)
- ✅ Exponential backoff retry logic (2 attempts)
- ✅ JSON request/response format
- ✅ Input validation (username, domain)
- ✅ Command injection prevention

### Supported Operations

```javascript
// Account Management
driver.createUser(data)              // Create hosting account
driver.deleteUser(username)          // Delete account
driver.suspendUser(username)         // Suspend account
driver.unsuspendUser(username)       // Resume account
driver.getUser(username)             // Get account info
driver.getUserStats(username)        // Get usage statistics
driver.listUsers()                   // List all accounts

// Domain Management
driver.createDomain(username, domain)  // Create domain
driver.deleteDomain(username, domain)  // Delete domain
driver.listDomains(username)           // List domains

// Database Management
driver.createDatabase(username, dbData)  // Create database
driver.deleteDatabase(username, dbName)  // Delete database
driver.listDatabases(username)           // List databases

// Email Management
driver.createMail(username, domain, emailData)  // Create email
driver.deleteMail(username, domain, account)    // Delete email

// SSL Certificates
driver.issueSSL(username, domain)    // Issue Let's Encrypt SSL

// API Verification
driver.testConnection()              // Verify API access
```

---

## 🔧 Configuration

### Environment Variables

```bash
# CyberPanel Connection
CYBERPANEL_HOST=192.168.1.100          # CyberPanel server IP/hostname
CYBERPANEL_PORT=8090                   # API port (default: 8090)
CYBERPANEL_API_TOKEN=your_token        # API token from CyberPanel
CYBERPANEL_USE_HTTP=true               # Use HTTP (true) or HTTPS (false)

# Optional
CYBERPANEL_REQUEST_TIMEOUT=30000       # Request timeout in ms (default: 30s)
CYBERPANEL_REJECT_UNAUTHORIZED=false   # Validate SSL cert (default: false for 8090)
```

### Database Storage

Credentials are stored in `SystemSetting` table:

```sql
INSERT INTO "SystemSetting" (key, value)
VALUES (
  'provisioning.cyberpanel',
  '{
    "host": "192.168.1.100",
    "port": 8090,
    "apiToken": "your_token",
    "useHTTP": true,
    "rejectUnauthorized": false
  }'
);
```

---

## 🚀 Admin Panel Setup

### Step 1: Get CyberPanel API Token

```bash
# Log into CyberPanel admin panel
# Navigate to: Settings → API Tokens
# Generate new token or copy existing one
```

### Step 2: Configure in WHMS

1. Navigate to `/api/admin/settings/cyberpanel`
2. Fill in credentials:
   - **Host**: CyberPanel server IP
   - **Port**: 8090 (default)
   - **API Token**: Token from Step 1
   - **Use HTTP**: true (for local/dev), false (for production)
3. Click "Test Connection"
4. Click "Save"

### API Endpoints

**GET /api/admin/settings/cyberpanel**
```json
{
  "success": true,
  "host": "192.168.1.100",
  "port": 8090,
  "useHTTP": true,
  "tokenMasked": "abc1****xyz8",
  "configured": true
}
```

**PUT /api/admin/settings/cyberpanel**
```json
{
  "host": "192.168.1.100",
  "port": 8090,
  "apiToken": "your_full_token",
  "useHTTP": true
}
```

**POST /api/admin/settings/cyberpanel/test**
```json
{
  "success": true,
  "connected": true,
  "verified": true,
  "message": "CyberPanel API connection verified"
}
```

---

## 📊 Provisioning Workflow

```
┌─────────────────────────────────────────────────────┐
│ 1. ADMIN SETS CREDENTIALS IN PANEL                  │
│    PUT /api/admin/settings/cyberpanel               │
│    ↓ Saved to Database (SystemSetting table)        │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│ 2. ORDER PLACED → STATUS CHANGES TO 'active'        │
│    ↓                                                 │
│ 3. ADMIN TRIGGERS PROVISIONING                      │
│    POST /api/admin/provisioning/orders/{id}/...     │
│    ↓ Returns jobId immediately (202 Accepted)       │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│ 4. JOB QUEUED IN REDIS                              │
│    ↓ Provisioning worker picks it up                │
│ 5. PROVISIONING SERVICE RUNS                        │
│    - Fetches CyberPanel credentials from DB         │
│    - Creates CyberPanelDriver with credentials      │
│    - Calls /api/accounts/addUser on CyberPanel      │
│    - Stores account in database                     │
│    ↓ Emits Socket.io event: provisioning:completed  │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│ 6. FRONTEND RECEIVES REAL-TIME UPDATE               │
│    socket.on('provisioning:completed', (data) =>{})  │
│    ↓ Shows account details to admin/client          │
│ 7. ACCOUNT LIVE AND READY                           │
│    ✅ Client can login to CyberPanel                │
│    ✅ Admin can manage account from WHMS            │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 Testing

### End-to-End Test

```bash
cd /home/memyselfandi/project/WHMS-fyp/backend

# Set your CyberPanel credentials
export CYBERPANEL_HOST="your_host"
export CYBERPANEL_PORT="8090"
export CYBERPANEL_API_TOKEN="your_token"

# Run the test
bash E2E_TEST_CYBERPANEL.sh
```

### Manual API Tests

```bash
# 1. Get current settings
curl -X GET http://localhost:4000/api/admin/settings/cyberpanel \
  -H "Authorization: Bearer $TOKEN"

# 2. Save credentials
curl -X PUT http://localhost:4000/api/admin/settings/cyberpanel \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "host":"192.168.1.100",
    "port":8090,
    "apiToken":"your_token",
    "useHTTP":true
  }'

# 3. Test connection
curl -X POST http://localhost:4000/api/admin/settings/cyberpanel/test \
  -H "Authorization: Bearer $TOKEN"

# 4. Provision account
curl -X POST http://localhost:4000/api/admin/provisioning/orders/order_123/provision-async \
  -H "Authorization: Bearer $TOKEN"

# 5. Check job status
curl -X GET http://localhost:4000/api/admin/provisioning/jobs/provision-order_123 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔐 Security Features

✅ **Bearer Token Authentication**
- Tokens never exposed in logs
- Masked in UI responses (first 4 + last 4 chars)
- Stored securely in database

✅ **Input Validation**
- Username: 3-16 chars, alphanumeric + hyphen only
- Domain: Regex validation for valid format
- Prevents command injection

✅ **Request Security**
- 30-second timeout per request
- Exponential backoff on failures
- Auto-retry mechanism (2 attempts)
- SSL verification configurable (default: false for port 8090)

✅ **Error Handling**
- Graceful failure with meaningful errors
- No sensitive data in error messages
- Comprehensive logging for debugging

---

## 📁 Files Summary

### New Files
```
src/modules/provisioning/drivers/cyberpanel.driver.js  (450+ lines)
E2E_TEST_CYBERPANEL.sh                                  (300+ lines)
CYBERPANEL_MIGRATION.md                                 (This file)
```

### Modified Files
```
src/modules/settings/settings.service.js               (Updated)
src/modules/settings/settings.controller.js            (Updated)
src/modules/settings/settings.routes.js                (Updated)
src/modules/provisioning/services/provisioning.service.js (Updated)
```

### Removed References
```
- All HestiaCP API code paths
- All VestaCP API code paths
- Legacy provisioning drivers
```

---

## ✨ Key Differences from HestiaCP/VestaCP

| Feature | HestiaCP/VestaCP | CyberPanel |
|---------|------------------|-----------|
| API Auth | MD5(token+timestamp) | Bearer Token |
| API Format | Custom pipe-delimited | JSON REST API |
| Port | 8083 (HTTPS only) | 8090 (HTTP/HTTPS) |
| Response Parsing | Pipe-delimited text | JSON only |
| Timeout | 15 seconds | 30 seconds |
| Request Body | URL-encoded form | JSON |
| SSL Default | Strict (rejectUnauthorized=true) | Relaxed (false for port 8090) |

---

## 🚀 Production Deployment

### Pre-Deployment Checklist

- [ ] CyberPanel installed and running on production server
- [ ] API token generated in CyberPanel admin
- [ ] Network connectivity verified (firewall allows 8090)
- [ ] Redis configured for BullMQ job queue
- [ ] Database migrations completed
- [ ] Environment variables configured
- [ ] Test connection succeeds
- [ ] Backup of existing provisioning data (if migrating)

### Deployment Steps

1. **Deploy code**: All updated backend files
2. **Run migrations**: None needed (uses existing tables)
3. **Set environment variables**: CYBERPANEL_* variables
4. **Restart server**: `npm start` or `pm2 restart all`
5. **Admin configuration**: Set CyberPanel credentials in panel
6. **Test provisioning**: Create test order and verify

---

## 📞 Support

### Troubleshooting

**Connection fails**:
- Verify CyberPanel host/port accessibility
- Check API token is valid
- Ensure firewall allows port 8090
- Test with curl: `curl -k https://host:8090/api/accounts/listUsers -H "Authorization: Bearer token"`

**Credentials not saving**:
- Check database write permissions
- Verify JWT token is valid
- Check admin user has correct permissions

**Provisioning hangs**:
- Check Redis connection
- Verify job queue is processing
- Review logs for worker errors
- Restart provisioning worker

---

## 📝 Notes

- **Backward Compatibility**: Old HestiaCP/VestaCP credentials in DB are no longer used
- **Migration Path**: If migrating from old system, manually move accounts or use data import
- **Support**: CyberPanel 2.0+ recommended (tested with latest versions)
- **Performance**: 30-second timeout suitable for most operations; increase if needed

---

**Status**: ✅ Complete & Production-Ready  
**Last Updated**: 2026-04-18  
**API Version**: CyberPanel 2.0+  
**Authentication**: Bearer Token (OAuth-style)
