# HestiaCP Provisioning - Quick Start Guide

## 🚀 5-Minute Setup

### 1. Get HestiaCP API Token (1 min)

SSH to your HestiaCP server:
```bash
ssh root@your-vps-ip
cat /root/.hestia/api/token
# Copy the token
```

### 2. Configure .env (1 min)

```bash
cd /path/to/WHMS-fyp/backend
```

Edit `.env`:
```bash
HESTIA_HOST=your-vps-ip
HESTIA_TOKEN=paste-token-here
HESTIA_PORT=8083
```

### 3. Test Connection (1 min)

```bash
npm run dev
# Server starts...

# In another terminal:
curl -X GET http://localhost:5000/api/admin/provisioning/test-connection \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Response should be:
# {"connected": true, "message": "HestiaCP connection successful"}
```

### 4. Create Test Order (1 min)

```bash
curl -X POST http://localhost:5000/api/admin/orders \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "client-123",
    "serviceId": "service-456",
    "quantity": 1,
    "status": "active"
  }'

# Get orderId from response
```

### 5. Provision Account (1 min)

```bash
curl -X POST http://localhost:5000/api/admin/provisioning/orders/ORDER_ID/provision \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Response includes:
# {
#   "username": "client-order-456",
#   "status": "active",
#   "controlPanel": "hestia"
# }
```

✅ **Account created on HestiaCP!**

---

## 📋 Common Tasks

### Add Domain to Account

**Sync (wait for completion):**
```bash
curl -X POST http://localhost:5000/api/client/provisioning/accounts/client-order-456/domains \
  -H "Authorization: Bearer CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "myclient.com"
  }'
```

**Async (get job ID):**
```bash
curl -X POST http://localhost:5000/api/admin/provisioning/accounts/client-order-456/domains-async \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "myclient.com"
  }'

# Response: {"jobId": "domain-...", "status": "queued"}
```

### Add Email Account

```bash
curl -X POST http://localhost:5000/api/client/provisioning/accounts/client-order-456/emails \
  -H "Authorization: Bearer CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "myclient.com",
    "account": "info",
    "quota": 500
  }'
```

### Suspend Account (Non-Payment)

```bash
curl -X POST http://localhost:5000/api/admin/provisioning/orders/order_123/suspend-async \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "non-payment"}'
```

### Unsuspend Account (Payment Received)

```bash
curl -X POST http://localhost:5000/api/admin/provisioning/orders/order_123/unsuspend-async \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Check Account Usage

```bash
curl -X GET http://localhost:5000/api/client/provisioning/accounts/client-order-456/stats \
  -H "Authorization: Bearer CLIENT_TOKEN"

# Response: {"diskUsedMB": 512, "bandwidthUsedGB": 5, ...}
```

### Watch Job Progress (Socket.io)

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000');
const jobId = 'provision-order_123';

// Start watching
socket.emit('provisioning:watch', jobId);

// Listen for updates
socket.on('provisioning:started', () => console.log('Started...'));
socket.on('provisioning:progress', (data) => console.log(data.progress + '%'));
socket.on('provisioning:completed', (data) => {
  console.log('✅ Account ready:', data.result);
  socket.emit('provisioning:unwatch', jobId);
});
socket.on('provisioning:failed', (err) => {
  console.error('❌ Failed:', err.error);
});
```

---

## 🔧 Configuration Variations

### HestiaCP + VestaCP (Both Configured)

The system auto-detects:

```bash
# If HestiaCP configured, uses HestiaCP
# Otherwise falls back to VestaCP (if configured)
# Otherwise marks as manual provision
```

To force panel selection:
```javascript
// In service snapshot:
{
  plan: {
    controlPanel: 'hestia'  // or 'vestacp'
  }
}
```

### Custom DNS Servers

```bash
curl -X POST http://localhost:5000/api/client/provisioning/accounts/username/domains \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com",
    "ns1": "ns1.custom-dns.com",
    "ns2": "ns2.custom-dns.com",
    "ns3": "ns3.custom-dns.com"
  }'
```

### Manual Provisioning (Fallback)

If HestiaCP is not configured, accounts are marked as manual:
```json
{
  "controlPanel": "manual",
  "username": "manual_order_123",
  "status": "active"
}
```

---

## 🐛 Troubleshooting

### "Connection refused"

```bash
# Check if HestiaCP is running
ssh root@your-vps
systemctl status hestiacp

# Check network connectivity
ping your-vps-ip
# Should have 0% packet loss

# Check firewall
# Port 8083 must be open from WHMS server to VPS
```

### "Invalid API token"

```bash
# Regenerate token on HestiaCP
# Update .env
# Restart WHMS: npm run dev
```

### Job stuck in "active" state

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Check worker logs
# Look for provisioning-worker errors in server output
```

### SSL certificate not issued

Let's Encrypt requires DNS propagation:

```bash
# Wait 15-30 minutes after domain creation
# Then retry SSL issuance
curl -X POST http://localhost:5000/api/admin/provisioning/accounts/username/domains-async \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com"}'
```

---

## 📊 Monitoring

### View All Accounts

```bash
curl -X GET http://localhost:5000/api/admin/provisioning/accounts \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Sync Account Stats (Hourly)

```bash
# Manual trigger
curl -X POST http://localhost:5000/api/admin/provisioning/sync-all \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Or add to crontab:
0 * * * * curl -X POST http://localhost:5000/api/admin/provisioning/sync-all \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### View Database Stats

```bash
# Check DB for active accounts
psql -h localhost -U whms_user -d whms -c \
  "SELECT username, status, diskUsedMB, bandwidthUsedGB FROM \"HostingAccount\" ORDER BY createdAt DESC LIMIT 10;"
```

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] `.env` has HESTIA_TOKEN (not in git!)
- [ ] HESTIA_REJECT_UNAUTHORIZED=true
- [ ] Admin API endpoints require auth
- [ ] Client can only access own accounts
- [ ] Passwords encrypted in DB
- [ ] HTTPS enabled on backend
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Backups configured
- [ ] Error monitoring (Sentry) set up

---

## 📚 Full Docs

- **Setup**: See `HESTIA_SETUP.md`
- **API Reference**: See `API_ENDPOINTS.md`
- **Integration Tests**: See `tests/hestia.integration.test.js`

---

## 🆘 Need Help?

1. Check error logs: `npm run dev` (server output)
2. Check HestiaCP logs: `ssh root@vps` then `tail -f /var/log/hestia/api.log`
3. Check Redis: `redis-cli` → `KEYS provisioning:*`
4. Test connection: `GET /api/admin/provisioning/test-connection`
5. Check database: `psql -d whms -c "SELECT * FROM \"HostingAccount\" LIMIT 1;"`

---

**Last Updated:** 2026-04-18
