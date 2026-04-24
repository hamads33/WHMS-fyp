# Provisioning API Endpoints

## Admin Endpoints

### Test HestiaCP Connection

**Endpoint:** `GET /api/admin/provisioning/test-connection`

Test if WHMS can connect to HestiaCP server.

**Response (Success):**
```json
{
  "connected": true,
  "hestia": {
    "connected": true,
    "success": true
  },
  "message": "HestiaCP connection successful"
}
```

**Response (Failure):**
```json
{
  "connected": false,
  "error": "Connection refused",
  "message": "Failed to connect to HestiaCP"
}
```

---

### Provision Account (Sync)

**Endpoint:** `POST /api/admin/provisioning/orders/{orderId}/provision`

Create hosting account synchronously (waits for completion).

**Parameters:**
- `orderId` (path): Order ID

**Response:**
```json
{
  "id": "acct_123",
  "orderId": "order_456",
  "clientId": "user_789",
  "username": "john-doe-456",
  "password": "encrypted...",
  "controlPanel": "hestia",
  "status": "active",
  "provisionedAt": "2026-04-18T12:00:00Z",
  "createdAt": "2026-04-18T12:00:00Z"
}
```

---

### Provision Account (Async)

**Endpoint:** `POST /api/admin/provisioning/orders/{orderId}/provision-async`

Create hosting account asynchronously (returns job ID immediately).

**Response (202 Accepted):**
```json
{
  "message": "Provisioning job queued",
  "jobId": "provision-order_456",
  "status": "queued"
}
```

**Frontend Usage:**
```javascript
// Get job ID from response
const jobId = 'provision-order_456';

// Poll for status
const pollStatus = async () => {
  const res = await fetch(`/api/admin/provisioning/jobs/${jobId}`);
  const status = await res.json();
  console.log(status.state); // 'active', 'completed', 'failed'
};

// Or use Socket.io for real-time updates
socket.emit('provisioning:watch', jobId);
socket.on('provisioning:completed', (data) => {
  console.log('Account created:', data.result);
});
```

---

### Get Provisioning Job Status

**Endpoint:** `GET /api/admin/provisioning/jobs/{jobId}`

Get current status of a provisioning job.

**Parameters:**
- `jobId` (path): Job ID from async provision

**Response:**
```json
{
  "jobId": "provision-order_456",
  "state": "completed",
  "progress": 100,
  "attempts": 1,
  "data": {
    "type": "create_account",
    "orderId": "order_456"
  },
  "failedReason": null
}
```

**States:**
- `waiting`: Job queued, waiting to start
- `active`: Job currently processing
- `completed`: Job finished successfully
- `failed`: Job failed after retries

---

### Suspend Account (Async)

**Endpoint:** `POST /api/admin/provisioning/orders/{orderId}/suspend-async`

Suspend a hosting account (for non-payment).

**Body:**
```json
{
  "reason": "non-payment"  // Optional
}
```

**Response:**
```json
{
  "message": "Suspend job queued",
  "jobId": "suspend-order_456",
  "status": "queued"
}
```

---

### Unsuspend Account (Async)

**Endpoint:** `POST /api/admin/provisioning/orders/{orderId}/unsuspend-async`

Restore a suspended hosting account.

**Response:**
```json
{
  "message": "Unsuspend job queued",
  "jobId": "unsuspend-order_456",
  "status": "queued"
}
```

---

### Provision Domain (Async)

**Endpoint:** `POST /api/admin/provisioning/accounts/{username}/domains-async`

Add domain to existing hosting account.

**Parameters:**
- `username` (path): HestiaCP username

**Body:**
```json
{
  "domain": "example.com",
  "ip": "shared",      // Optional: 'shared' or specific IP
  "ns1": "ns1.example.com",  // Optional
  "ns2": "ns2.example.com"   // Optional
}
```

**Response:**
```json
{
  "message": "Domain provision job queued",
  "jobId": "domain-john-doe-456-example.com",
  "status": "queued"
}
```

---

### List All Accounts (Admin)

**Endpoint:** `GET /api/admin/provisioning/accounts`

List all hosting accounts with pagination.

**Query Parameters:**
- `limit` (optional): Page size (default: 100)
- `offset` (optional): Skip count (default: 0)

**Response:**
```json
[
  {
    "id": "acct_123",
    "username": "john-doe-456",
    "status": "active",
    "controlPanel": "hestia",
    "diskUsedMB": 512,
    "bandwidthUsedGB": 5,
    "provisionedAt": "2026-04-18T12:00:00Z",
    "createdAt": "2026-04-18T12:00:00Z",
    "client": {
      "id": "user_789",
      "email": "john@example.com"
    },
    "order": {
      "id": "order_456",
      "status": "active"
    }
  }
]
```

---

### Get Account Details (Admin)

**Endpoint:** `GET /api/admin/provisioning/accounts/{username}`

Get details of a specific hosting account.

**Response:**
```json
{
  "id": "acct_123",
  "username": "john-doe-456",
  "status": "active",
  "controlPanel": "hestia",
  "diskUsedMB": 512,
  "bandwidthUsedGB": 5,
  "lastSyncedAt": "2026-04-18T11:00:00Z",
  "provisionedAt": "2026-04-18T12:00:00Z"
}
```

---

### Sync Account Stats

**Endpoint:** `POST /api/admin/provisioning/accounts/{username}/sync`

Manually sync disk usage and bandwidth stats from HestiaCP.

**Response:**
```json
{
  "message": "Stats synced",
  "stats": {
    "username": "john-doe-456",
    "stats": {
      "U_DISK": 512,
      "U_BANDWIDTH": 5
    }
  }
}
```

---

### Sync All Accounts Stats

**Endpoint:** `POST /api/admin/provisioning/sync-all`

Sync stats for all active accounts (use as cron job).

**Response:**
```json
{
  "total": 45,
  "synced": 43,
  "failed": 2,
  "errors": [
    {
      "username": "broken-user-123",
      "error": "User not found on HestiaCP"
    }
  ]
}
```

---

## Client Endpoints

### List My Accounts

**Endpoint:** `GET /api/client/provisioning/accounts`

List all hosting accounts for logged-in client.

**Response:**
```json
[
  {
    "id": "acct_123",
    "username": "john-doe-456",
    "status": "active",
    "controlPanel": "hestia",
    "diskUsedMB": 512,
    "bandwidthUsedGB": 5,
    "domains": [
      {
        "id": "domain_789",
        "domain": "example.com",
        "status": "active",
        "sslStatus": "active"
      }
    ],
    "emails": [
      {
        "id": "email_111",
        "email": "info@example.com",
        "quota": 100,
        "status": "active"
      }
    ]
  }
]
```

---

### Get Account for Order

**Endpoint:** `GET /api/client/provisioning/accounts/order/{orderId}`

Get hosting account associated with specific order.

**Response:**
```json
{
  "id": "acct_123",
  "orderId": "order_456",
  "username": "john-doe-456",
  "status": "active",
  "controlPanel": "hestia",
  "domains": [...],
  "emails": [...]
}
```

---

### Get Account Details

**Endpoint:** `GET /api/client/provisioning/accounts/{username}`

Get details of hosting account by username.

**Response:** Same as above

---

### Add Domain to Account

**Endpoint:** `POST /api/client/provisioning/accounts/{username}/domains`

Provision a new domain to hosting account.

**Body:**
```json
{
  "domain": "mydomain.com",
  "ip": "shared",      // Optional
  "ns1": "ns1.example.com",   // Optional
  "ns2": "ns2.example.com"    // Optional
}
```

**Response:**
```json
{
  "id": "domain_789",
  "hostingAccountId": "acct_123",
  "domain": "mydomain.com",
  "status": "active",
  "sslStatus": null,
  "createdAt": "2026-04-18T12:00:00Z"
}
```

---

### Add Email Account

**Endpoint:** `POST /api/client/provisioning/accounts/{username}/emails`

Create email account on domain.

**Body:**
```json
{
  "domain": "example.com",
  "account": "info",              // local part before @
  "password": "SecurePass123!",   // Optional: auto-generated if omitted
  "quota": 100                    // MB (default: 100)
}
```

**Response:**
```json
{
  "id": "email_111",
  "hostingAccountId": "acct_123",
  "email": "info@example.com",
  "password": "encrypted...",
  "quota": 100,
  "status": "active",
  "createdAt": "2026-04-18T12:00:00Z"
}
```

---

### Get Account Usage Stats

**Endpoint:** `GET /api/client/provisioning/accounts/{username}/stats`

Get current disk usage and bandwidth for account.

**Response:**
```json
{
  "username": "john-doe-456",
  "diskUsedMB": 512,
  "bandwidthUsedGB": 5,
  "status": "active",
  "createdAt": "2026-04-18T12:00:00Z"
}
```

---

## Socket.io Events

### Watch Job

```javascript
socket.emit('provisioning:watch', 'provision-order_456');
```

Listen for job updates:
```javascript
socket.on('provisioning:started', (data) => {
  console.log('Job started:', data.jobId);
});

socket.on('provisioning:progress', (data) => {
  console.log('Progress:', data.progress + '%');
});

socket.on('provisioning:completed', (data) => {
  console.log('Completed:', data.result);
});

socket.on('provisioning:failed', (data) => {
  console.error('Failed:', data.error);
  console.log('Retries: ' + data.attemptsMade);
});
```

### Unwatch Job

```javascript
socket.emit('provisioning:unwatch', 'provision-order_456');
```

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "Invalid domain format"
}
```

### 404 Not Found

```json
{
  "error": "Hosting account not found"
}
```

### 409 Conflict

```json
{
  "error": "Account already provisioned for this order"
}
```

### 503 Service Unavailable

```json
{
  "error": "HestiaCP API error: Connection refused"
}
```

---

## Rate Limiting

- Admin endpoints: 100 req/min per IP
- Client endpoints: 50 req/min per user
- Provisioning jobs: 10 simultaneous max

---

## Authentication

All endpoints require Bearer token in Authorization header:

```
Authorization: Bearer eyJhbGc...
```

Admin endpoints require `admin` or `super_admin` role.

---

## Examples

### Full Workflow: From Order to Live Account

```javascript
// 1. Admin triggers async provisioning
const provRes = await fetch('/api/admin/provisioning/orders/order_456/provision-async', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
const { jobId } = await provRes.json();

// 2. Watch job progress via Socket.io
socket.emit('provisioning:watch', jobId);

socket.on('provisioning:completed', async (data) => {
  const account = data.result;
  
  // 3. Send credentials to client
  const domain = account.username; // Or let client add custom domain
  
  // 4. Client adds domain (optional)
  await fetch(`/api/client/provisioning/accounts/${account.username}/domains`, {
    method: 'POST',
    body: JSON.stringify({
      domain: 'client-domain.com'
    }),
    headers: { 'Authorization': `Bearer ${clientToken}` }
  });
  
  // 5. Client adds email (optional)
  await fetch(`/api/client/provisioning/accounts/${account.username}/emails`, {
    method: 'POST',
    body: JSON.stringify({
      domain: 'client-domain.com',
      account: 'info',
      quota: 500
    }),
    headers: { 'Authorization': `Bearer ${clientToken}` }
  });
  
  // 6. Account is live and ready!
  console.log('Account ready:', account.username);
});
```

---

**Last Updated:** 2026-04-18
