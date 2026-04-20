# HestiaCP Integration Setup Guide

## Overview

WHMS now supports real HestiaCP provisioning. When orders are placed, hosting accounts are automatically created on HestiaCP with full domain, email, and database support.

## Prerequisites

- HestiaCP installed on VPS (port 8083 HTTPS)
- HestiaCP admin panel access
- Network connectivity from WHMS server to HestiaCP server

## Step 1: Get HestiaCP API Token

### Via HestiaCP Admin Panel

1. Log in to HestiaCP at `https://{server-ip}:8083`
2. Go to **Admin** → **API Tokens**
3. Click **Add Token**
4. Generate a new token (save securely)
5. Copy the token

### Via SSH (Alternative)

```bash
cat /root/.hestia/api/token
```

## Step 2: Configure Environment Variables

Add to `.env.local`:

```bash
# HestiaCP Configuration
HESTIA_HOST=192.168.x.x           # VPS IP or hostname
HESTIA_PORT=8083                  # Always 8083 for HestiaCP
HESTIA_TOKEN=your_api_token_here  # Token from Step 1
HESTIA_REJECT_UNAUTHORIZED=true   # Validate SSL cert (production)

# For development without SSL validation:
# HESTIA_REJECT_UNAUTHORIZED=false
```

## Step 3: Test Connection

### Test Endpoint

```bash
curl -X GET http://localhost:5000/api/admin/provisioning/test-connection
```

Expected response:
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

## Step 4: Provision an Account

### Option A: Synchronous Provisioning (Wait for completion)

```bash
curl -X POST http://localhost:5000/api/admin/provisioning/orders/{orderId}/provision \
  -H "Authorization: Bearer {admin_token}"
```

### Option B: Asynchronous Provisioning (Returns job ID)

```bash
curl -X POST http://localhost:5000/api/admin/provisioning/orders/{orderId}/provision-async \
  -H "Authorization: Bearer {admin_token}"
```

Response:
```json
{
  "message": "Provisioning job queued",
  "jobId": "provision-{orderId}",
  "status": "queued"
}
```

### Check Job Status

```bash
curl -X GET http://localhost:5000/api/admin/provisioning/jobs/provision-{orderId} \
  -H "Authorization: Bearer {admin_token}"
```

## Step 5: API Endpoints Reference

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/provisioning/test-connection` | Test HestiaCP connectivity |
| POST | `/api/admin/provisioning/orders/{orderId}/provision` | Sync provision account |
| POST | `/api/admin/provisioning/orders/{orderId}/provision-async` | Async provision account |
| GET | `/api/admin/provisioning/jobs/{jobId}` | Check provisioning job status |
| POST | `/api/admin/provisioning/orders/{orderId}/suspend-async` | Suspend account (async) |
| POST | `/api/admin/provisioning/orders/{orderId}/unsuspend-async` | Unsuspend account (async) |
| POST | `/api/admin/provisioning/accounts/{username}/domains-async` | Add domain (async) |
| GET | `/api/admin/provisioning/accounts` | List all hosting accounts |
| GET | `/api/admin/provisioning/accounts/{username}` | Get account details |
| POST | `/api/admin/provisioning/accounts/{username}/sync` | Sync account stats |
| POST | `/api/admin/provisioning/sync-all` | Sync all account stats |

### Client Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/client/provisioning/accounts` | List my accounts |
| GET | `/api/client/provisioning/accounts/{orderId}` | Get account for order |
| GET | `/api/client/provisioning/accounts/{username}` | Get account details |
| POST | `/api/client/provisioning/accounts/{username}/domains` | Add domain |
| POST | `/api/client/provisioning/accounts/{username}/emails` | Add email account |
| GET | `/api/client/provisioning/accounts/{username}/stats` | Get account usage |

## Step 6: Real-Time Updates via Socket.io

### Frontend Socket.io Listener

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

// Watch a provisioning job
socket.emit('provisioning:watch', 'provision-order-123');

// Listen for updates
socket.on('provisioning:started', (data) => {
  console.log('Provisioning started:', data);
});

socket.on('provisioning:progress', (data) => {
  console.log('Progress:', data.progress);
});

socket.on('provisioning:completed', (data) => {
  console.log('Completed:', data.result);
  socket.emit('provisioning:unwatch', 'provision-order-123');
});

socket.on('provisioning:failed', (data) => {
  console.error('Failed:', data.error);
});
```

## Step 7: Database Models

Existing models used:

- **HostingAccount**: Stores account credentials and status
  - `username`: HestiaCP username
  - `password`: Encrypted password
  - `controlPanel`: 'hestia' or 'vestacp'
  - `status`: 'pending', 'active', 'suspended', 'deleted'
  - `diskUsedMB`: Current disk usage
  - `bandwidthUsedGB`: Current bandwidth usage

- **HostingDomain**: Domain records
  - `domain`: Domain name
  - `status`: 'active', 'suspended'
  - `sslStatus`: 'pending', 'active'

- **HostingEmail**: Email accounts
  - `email`: Full email address
  - `password`: Encrypted password
  - `quota`: MB quota

- **HostingDatabase**: Database instances
  - `name`: Database name
  - `type`: 'mysql' or 'pgsql'
  - `username`: DB user
  - `password`: Encrypted password

## Step 8: Provisioning Workflow

### Order Activation Flow

1. Order status changes to `active`
2. Provisioning service is called
3. HestiaCP account created via `v-add-user`
4. Account record stored in database
5. Client receives login credentials
6. (Optional) Domain provisioned via `v-add-domain`
7. (Optional) SSL certificate issued via `v-add-letsencrypt-domain`

### Suspension Flow

1. Invoice becomes overdue
2. Billing module calls suspension endpoint
3. Account suspended via `v-suspend-user`
4. Client cannot access panel

### Unsuspension Flow

1. Invoice payment received
2. Billing module calls unsuspension endpoint
3. Account unsuspended via `v-unsuspend-user`
4. Client regains access

## Step 9: Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `HestiaCP API error: Connection refused` | HestiaCP not running | Check `systemctl status hestiacp` |
| `Invalid domain format` | Domain validation failed | Ensure domain is valid (e.g., example.com) |
| `Username must be 3-16 characters` | Username too short/long | System generates valid username automatically |
| `HestiaCP token not configured` | HESTIA_TOKEN env var missing | Add token to .env.local |

### Retry Logic

- Account creation: 3 attempts (exponential backoff 2s delay)
- Domain provisioning: 2 attempts (exponential backoff 1s delay)
- Suspension: 2 attempts (exponential backoff 1s delay)

Failed jobs are retained for manual review in the provisioning queue.

## Step 10: Monitoring & Maintenance

### Check Worker Status

```bash
# View provisioning worker logs
# (Configure via Docker or PM2)

# Check Redis queue
redis-cli
> KEYS provisioning:*
> HGETALL bull:provisioning:*
```

### Sync Account Stats (Cron)

```bash
# Run hourly via admin cron endpoint
POST /api/admin/provisioning/sync-all

# Or add to crontab:
0 * * * * curl -X POST http://localhost:5000/api/admin/provisioning/sync-all \
  -H "Authorization: Bearer {admin_token}"
```

### Database Backups

Store encrypted passwords in `HostingAccount.password`:

```javascript
const { decryptValue } = require('./utils/encryption');
const password = decryptValue(account.password);
```

## Troubleshooting

### HestiaCP Connection Issues

```bash
# SSH to HestiaCP server
ssh root@{hestia-server}

# Check HestiaCP service
systemctl status hestiacp

# Check API logs
tail -f /var/log/hestia/api.log

# Test API locally
curl -s "https://localhost:8083/api/cmd/" \
  --data "cmd=v-list-sys-info&hash=abc&timestamp=123"
```

### Provisioning Worker Not Processing

```bash
# Check Redis connection
redis-cli ping
# Should return: PONG

# Check queue
redis-cli
> KEYS bull:provisioning:*
> LLEN bull:provisioning:active
```

### SSL Certificate Issues

Let's Encrypt requires DNS to be configured before issuance. If SSL fails:

1. Ensure domain DNS points to HestiaCP server
2. Wait 15-30 minutes for DNS propagation
3. Retry SSL issuance via `/api/admin/provisioning/accounts/{username}/domains-async`

## Security Best Practices

✅ **DO:**
- Store HESTIA_TOKEN in .env.local (never commit)
- Use HTTPS for all connections (HESTIA_REJECT_UNAUTHORIZED=true)
- Validate all user input (username, domain format)
- Encrypt passwords in database
- Use authentication guards on admin endpoints
- Log all provisioning actions for audit

❌ **DON'T:**
- Expose HESTIA_TOKEN in frontend code
- Disable SSL verification in production
- Store plain-text passwords
- Allow unauthenticated provisioning requests
- Skip input validation

## Production Checklist

- [ ] HestiaCP installed and running
- [ ] HESTIA_TOKEN configured in .env.local
- [ ] Redis configured for BullMQ
- [ ] Provisioning worker container running
- [ ] Socket.io enabled on backend
- [ ] Database backups configured
- [ ] SSL certificates valid
- [ ] Error monitoring (Sentry/LogRocket) set up
- [ ] Admin audit logging enabled
- [ ] Rate limiting on provisioning endpoints

## Support

For issues:

1. Check HestiaCP API documentation: https://docs.hestiacp.com/admin_guide/api/
2. Review logs in `/var/log/hestia/api.log`
3. Test API token independently
4. Verify network connectivity

---

**Last Updated:** 2026-04-18
