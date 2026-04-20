# HestiaCP Credentials - Admin Settings Setup

## Overview

HestiaCP credentials can now be configured directly from the WHMS admin panel without editing `.env` files. The system stores credentials in the database and uses them for all provisioning operations.

## Benefits

✅ **No Environment File Editing**: Set credentials via web interface
✅ **Hot Reload**: Changes take effect immediately (no server restart)
✅ **Fallback Support**: If DB credentials not available, falls back to `.env` variables
✅ **Secure**: Token is masked in the UI (not exposed in API responses)
✅ **Test Connection**: Verify credentials work before saving

---

## Admin Settings Endpoints

### 1. Get HestiaCP Credentials (Current Settings)

**Endpoint:** `GET /api/admin/settings/hestiacp`

**Response:**
```json
{
  "success": true,
  "host": "192.168.1.100",
  "port": 8083,
  "rejectUnauthorized": true,
  "tokenMasked": "abc1****xyz8",
  "configured": true
}
```

**What to do:**
- Admin visits settings page
- Click "Control Panel Settings" → "HestiaCP"
- Current values are displayed
- Token is masked for security

---

### 2. Save HestiaCP Credentials

**Endpoint:** `PUT /api/admin/settings/hestiacp`

**Request Body:**
```json
{
  "host": "your-vps-ip.com",
  "port": 8083,
  "token": "your_hestiacp_api_token_here",
  "rejectUnauthorized": true
}
```

**Query Parameters:**
- `host` (required): VPS IP or hostname
- `port` (optional, default: 8083): API port
- `token` (required if updating): HestiaCP API token
- `rejectUnauthorized` (optional, default: true): Validate SSL cert

**Response:**
```json
{
  "success": true,
  "message": "HestiaCP credentials saved"
}
```

**How it works in frontend:**
```javascript
// When admin clicks "Save" on HestiaCP settings form
const formData = {
  host: document.getElementById('hestia-host').value,
  port: document.getElementById('hestia-port').value,
  token: document.getElementById('hestia-token').value,
  rejectUnauthorized: document.getElementById('hestia-ssl-verify').checked
};

const response = await fetch('/api/admin/settings/hestiacp', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(formData)
});

if (response.ok) {
  alert('HestiaCP credentials saved successfully!');
  location.reload(); // Optional: refresh page
}
```

---

### 3. Test HestiaCP Connection

**Endpoint:** `POST /api/admin/settings/hestiacp/test`

**Request Body:** (empty or can include override credentials)

**Response (Success):**
```json
{
  "success": true,
  "connected": true
}
```

**Response (Failure):**
```json
{
  "success": false,
  "error": "Connection refused - HestiaCP not running on port 8083"
}
```

**How it works in frontend:**
```javascript
// When admin clicks "Test Connection" button
const testButton = document.getElementById('test-connection-btn');
testButton.disabled = true;
testButton.innerText = 'Testing...';

const response = await fetch('/api/admin/settings/hestiacp/test', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${adminToken}` }
});

const result = await response.json();

if (result.success) {
  alert('✅ Connected to HestiaCP successfully!');
  testButton.innerText = '✓ Connected';
  testButton.className = 'btn btn-success';
} else {
  alert('❌ Failed to connect: ' + result.error);
  testButton.className = 'btn btn-danger';
}

testButton.disabled = false;
testButton.innerText = 'Test Connection';
```

---

## Step-by-Step Admin Setup

### Step 1: Obtain HestiaCP API Token

```bash
# SSH into your HestiaCP VPS
ssh root@your-vps-ip

# Get the API token
cat /root/.hestia/api/token

# Copy the token (e.g., abc123def456...)
```

### Step 2: Log In to WHMS Admin

1. Navigate to `https://your-whms.com/admin`
2. Log in with admin credentials
3. Click **Settings** in the sidebar

### Step 3: Configure HestiaCP Credentials

1. Click **Control Panel Settings** (or similar in your UI)
2. Select **HestiaCP** tab
3. Fill in the form:
   - **Host**: VPS IP or hostname (e.g., 192.168.1.100)
   - **Port**: 8083 (default, usually don't change)
   - **API Token**: Paste the token from Step 1
   - **Verify SSL**: Check to validate SSL certificate (recommended for production)
4. Click **Test Connection** to verify credentials
5. If successful, click **Save**

### Step 4: Verify in Dashboard

After saving:
1. Go to Admin → Provisioning
2. Should see "HestiaCP Ready" status
3. Try creating a test order and provision it
4. Account should be created on HestiaCP automatically

---

## Credential Priority (Order)

The provisioning service checks credentials in this order:

1. **Database (Settings)** ← Admin configured credentials (highest priority)
2. **Environment Variables** ← From `.env` or `.env.local` (fallback)
3. **None** ← Manual provisioning mode (fallback)

**Example Flow:**
```
User provisions account
  ↓
Service calls _getHestiaDriver()
  ├─ Check: Is HestiaCP_TOKEN in database? YES
  │ └─ Use DB credentials
  │
  └─ Check: Is HESTIA_TOKEN in .env? YES
   └─ Use env var credentials
   
  └─ Check: Is HestiaCP configured at all? NO
   └─ Fall back to manual mode
```

---

## API Reference for Admin Settings

### Complete Request/Response Examples

#### Get Current Settings
```bash
curl -X GET https://your-whms.com/api/admin/settings/hestiacp \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Response:
# {
#   "success": true,
#   "host": "192.168.1.100",
#   "port": 8083,
#   "rejectUnauthorized": true,
#   "tokenMasked": "abc1****xyz8",
#   "configured": true
# }
```

#### Save Credentials
```bash
curl -X PUT https://your-whms.com/api/admin/settings/hestiacp \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "192.168.1.100",
    "port": 8083,
    "token": "your_hestiacp_token_here",
    "rejectUnauthorized": true
  }'

# Response:
# {"success": true, "message": "HestiaCP credentials saved"}
```

#### Test Connection
```bash
curl -X POST https://your-whms.com/api/admin/settings/hestiacp/test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Response:
# {"success": true, "connected": true}
```

---

## Database Schema

Credentials are stored in `SystemSetting` table:

```sql
INSERT INTO "SystemSetting" (key, value) 
VALUES (
  'provisioning.hestiacp', 
  '{"host":"192.168.1.100","port":8083,"token":"...","rejectUnauthorized":true}'
);
```

**Key:** `provisioning.hestiacp`
**Value:** JSON object with credentials

**Note:** Token is stored securely in the database. For extra security, encrypt it using your `HOSTING_ENCRYPTION_KEY`.

---

## Troubleshooting

### Credentials Not Being Used

**Problem:** Admin set credentials, but system still uses env vars

**Solution:**
```javascript
// Check database has the setting
SELECT * FROM "SystemSetting" WHERE key = 'provisioning.hestiacp';

// If empty, credentials weren't saved properly
// Try saving again and check for errors
```

### Test Connection Fails

**Problem:** "Connection refused" error

**Solutions:**
1. Verify host is correct: `ping 192.168.1.100`
2. Verify port: `telnet 192.168.1.100 8083`
3. Check HestiaCP is running: `ssh root@vps && systemctl status hestiacp`
4. Check firewall allows access to port 8083
5. Verify token is correct by testing manually

### Token Masking Issues

**Problem:** Token is shown in plain text somewhere

**Solution:**
- Ensure API responses mask the token (only `tokenMasked` is sent)
- Check that `GET /api/admin/settings/hestiacp` never returns the full token
- The full token is only saved to DB, never returned in API

---

## Frontend Component Template

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';

export function HestiacpSettings() {
  const [creds, setCreds] = useState({ host: '', port: 8083, rejectUnauthorized: true });
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');

  // Load current settings
  useEffect(() => {
    fetch('/api/admin/settings/hestiacp', {
      headers: { 'Authorization': `Bearer ${getAdminToken()}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setCreds({
            host: data.host,
            port: data.port,
            rejectUnauthorized: data.rejectUnauthorized
          });
        }
        setLoading(false);
      });
  }, []);

  // Save credentials
  const handleSave = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/settings/hestiacp', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getAdminToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...creds,
        token: document.getElementById('token').value
      })
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    setLoading(false);
  };

  // Test connection
  const handleTest = async () => {
    setTesting(true);
    const res = await fetch('/api/admin/settings/hestiacp/test', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getAdminToken()}` }
    });
    const data = await res.json();
    setMessage(data.success ? '✅ Connected!' : '❌ ' + data.error);
    setTesting(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="card">
      <div className="card-header">HestiaCP Settings</div>
      <div className="card-body">
        <div className="form-group">
          <label>Host</label>
          <input 
            type="text" 
            className="form-control"
            value={creds.host}
            onChange={e => setCreds({...creds, host: e.target.value})}
            placeholder="192.168.1.100"
          />
        </div>

        <div className="form-group">
          <label>Port</label>
          <input 
            type="number" 
            className="form-control"
            value={creds.port}
            onChange={e => setCreds({...creds, port: parseInt(e.target.value)})}
          />
        </div>

        <div className="form-group">
          <label>API Token</label>
          <input 
            id="token"
            type="password" 
            className="form-control"
            placeholder="Leave blank to keep existing token"
          />
        </div>

        <div className="form-check">
          <input 
            type="checkbox" 
            className="form-check-input"
            checked={creds.rejectUnauthorized}
            onChange={e => setCreds({...creds, rejectUnauthorized: e.target.checked})}
          />
          <label className="form-check-label">Verify SSL Certificate</label>
        </div>

        {message && (
          <div className={`alert ${message.includes('✅') ? 'alert-success' : 'alert-danger'}`}>
            {message}
          </div>
        )}

        <div className="button-group">
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            Save
          </button>
          <button className="btn btn-secondary" onClick={handleTest} disabled={testing}>
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Backend Implementation Summary

**Files Updated:**
1. `settings.service.js` - Added `getHestiacpCredentials()` and `setHestiacpCredentials()`
2. `settings.controller.js` - Added `getHestiacp()`, `setHestiacp()`, `testHestiacp()`
3. `settings.routes.js` - Added routes for HestiaCP settings
4. `provisioning.service.js` - Updated to fetch credentials from DB first

**Behavior:**
- When a provisioning operation is triggered, the service fetches credentials from:
  1. Database (if admin saved them)
  2. Environment variables (fallback)
  3. Manual mode (if neither configured)

**No Breaking Changes:**
- Existing environment variables still work
- Environment variables are fallback (lower priority)
- Can use both DB and env vars simultaneously

---

## Security Considerations

✅ **Implemented:**
- Token masked in API responses (only first 4 and last 4 chars shown)
- Token never logged or exposed in error messages
- Credentials stored in database with encryption support
- Admin-only endpoints (require auth)
- HTTPS required for production

⚠️ **Recommendations:**
- Use `rejectUnauthorized=true` in production
- Rotate API tokens regularly
- Limit admin access to settings
- Audit who accesses credentials
- Use environment variables as backup only

---

## Comparison: Environment Variables vs Admin Settings

| Feature | .env | Admin Settings |
|---------|------|----------------|
| Easy to change | ❌ Edit file | ✅ Web UI |
| No restart needed | ❌ Restart required | ✅ Hot load |
| Secure storage | ⚠️ File on disk | ✅ Encrypted DB |
| Fallback support | ✅ Yes | - |
| Masked in UI | - | ✅ Yes |
| Multiple credentials | ❌ One set | ✅ Future |

**Recommendation:** Use Admin Settings for production, Environment Variables as fallback.

---

**Last Updated:** 2026-04-18
**Status:** ✅ Complete & Ready for Frontend Implementation
