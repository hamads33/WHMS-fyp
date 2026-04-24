# ServersAPI Reference

Complete API reference for server management operations.

## Base URL
`/api/admin/server-management`

## Servers Endpoints

### List Servers
```
GET /servers
Query params: { groupId?, status?, type? }
Response: { data: Server[], total: number }
```

### Get Server
```
GET /servers/:id
Response: Server
```

### Create Server
```
POST /servers
Body: {
  name: string (2-100 chars, required)
  hostname: string (hostname format, required)
  ipAddress: string (IP format, required)
  type: string (mock-cpanel|mock-vps|mock-cloud, required)
  status?: string (active|offline|maintenance, default: active)
  groupId?: string (uuid, optional)
  tags?: string[] (max 50 chars each)
  isDefault?: boolean
  capabilities?: {
    ssl: boolean
    backups: boolean
    docker: boolean
    nodejs: boolean
    python: boolean
    email: boolean
  }
}
Response: Server (201)
```

### Update Server
```
PATCH /servers/:id
Body: Partial<Server creation fields>
Response: Server
```

### Delete Server
```
DELETE /servers/:id
Response: 204 No Content
```

### Test Connection
```
POST /servers/:id/test
Response: {
  status: string (success|failure)
  latency: number (milliseconds)
  message?: string
}
```

### Get Metrics
```
GET /servers/:id/metrics
Response: {
  cpuUsage: number (0-100)
  ramUsage: number (0-100)
  diskUsage: number (0-100)
  latency: number (ms)
  uptime: number (seconds)
}
```

### Get Metrics History
```
GET /servers/:id/metrics/history?range=24h|7d|30d
Response: { data: ServerMetric[], total: number, range: string }
```

### Set Maintenance
```
PATCH /servers/:id/maintenance
Body: { enabled: boolean }
Response: Server
```

### Get Capabilities
```
GET /servers/:id/capabilities
Response: {
  serverId: string
  capabilities: { ssl, backups, docker, nodejs, python, email }
}
```

## Account Endpoints

### List Accounts by Server
```
GET /servers/:id/accounts
Response: { data: ServerManagedAccount[], total: number }
```

### Create Account
```
POST /servers/:id/accounts
Body: {
  userId: string (uuid, required)
  domain: string (domain format, required)
  username: string (alphanum, 3-32 chars, required)
  password: string (8-64 chars, required)
  diskLimitMB?: number (256-1048576)
  bandwidthLimitMB?: number (1024-10485760)
  databaseLimit?: number (1-100)
  emailLimit?: number (1-1000)
}
Response: { jobId: string, status: string, message: string } (202)
```

### Suspend Account
```
PATCH /servers/accounts/:accountId/suspend
Response: { jobId: string, status: string, message: string }
```

### Terminate Account
```
PATCH /servers/accounts/:accountId/terminate
Response: { jobId: string, status: string, message: string }
```

### Get Account Usage
```
GET /servers/accounts/:accountId/usage
Response: {
  diskUsedMB: number
  bandwidthUsedMB: number
  databaseUsed: number
  emailUsed: number
}
```

### Update Account Quotas
```
PATCH /servers/accounts/:accountId/quotas
Body: {
  diskLimitMB?: number
  bandwidthLimitMB?: number
  databaseLimit?: number
  emailLimit?: number
}
Response: ServerManagedAccount
```

## Log Endpoints

### Get Server Logs
```
GET /servers/:id/logs?action=?&limit=50
Response: { data: ServerLog[], total: number }
```

### Get All Logs
```
GET /server-logs?action=?&limit=100
Response: { data: ServerLog[], total: number }
```

## Group Endpoints

### List Groups
```
GET /server-groups
Response: { data: ServerGroup[], total: number }
```

### Get Group
```
GET /server-groups/:id
Response: ServerGroup
```

### Create Group
```
POST /server-groups
Body: {
  name: string (2-100 chars, required, unique)
  description?: string (max 500 chars)
}
Response: ServerGroup (201)
```

### Update Group
```
PATCH /server-groups/:id
Body: Partial<{name, description}>
Response: ServerGroup
```

### Delete Group
```
DELETE /server-groups/:id
Response: 204 No Content
```

### Assign Server to Group
```
POST /server-groups/:id/assign
Body: { serverId: string }
Response: Server
```

### Set Default Server
```
POST /server-groups/:id/default
Body: { serverId: string }
Response: Server
```

## Data Models

### Server
```typescript
{
  id: string
  name: string
  hostname: string
  ipAddress: string
  type: "mock-cpanel" | "mock-vps" | "mock-cloud"
  status: "active" | "offline" | "maintenance"
  tags: string[]
  isDefault: boolean
  capabilities: {
    ssl: boolean
    backups: boolean
    docker: boolean
    nodejs: boolean
    python: boolean
    email: boolean
  }
  groupId?: string
  group?: ServerGroup
  createdAt: DateTime
  updatedAt: DateTime
  accounts?: ServerManagedAccount[]
  logs?: ServerLog[]
  metricsHistory?: ServerMetric[]
}
```

### ServerGroup
```typescript
{
  id: string
  name: string
  description?: string
  servers?: Server[]
  createdAt: DateTime
  updatedAt: DateTime
}
```

### ServerLog
```typescript
{
  id: string
  serverId: string
  action: string
  message?: string
  createdAt: DateTime
}
```

### ServerMetric
```typescript
{
  id: string
  serverId: string
  cpuUsage: number (0-100)
  ramUsage: number (0-100)
  diskUsage: number (0-100)
  latency: number (ms)
  uptime: number (seconds)
  recordedAt: DateTime
}
```

### ServerManagedAccount
```typescript
{
  id: string
  userId: string
  serverId: string
  domain: string
  status: "active" | "suspended" | "terminated"
  diskLimitMB: number
  bandwidthLimitMB: number
  databaseLimit: number
  emailLimit: number
  diskUsedMB: number
  bandwidthUsedMB: number
  databaseUsed: number
  emailUsed: number
  createdAt: DateTime
  updatedAt: DateTime
}
```

## Status Codes

- **200 OK** - Successful GET/PATCH
- **201 Created** - Successful POST
- **202 Accepted** - Job queued (async operations)
- **204 No Content** - Successful DELETE
- **400 Bad Request** - Validation error
- **404 Not Found** - Resource not found
- **409 Conflict** - Business logic conflict (e.g., duplicate name)
- **422 Unprocessable Entity** - Validation failed
- **500 Internal Server Error** - Server error

## Error Response Format

```json
{
  "error": "Human readable error message",
  "details": ["Field validation error 1", "Field validation error 2"]
}
```

## Validation Rules

| Field | Rule |
|-------|------|
| name | 2-100 characters, required |
| hostname | Valid hostname format, required |
| ipAddress | Valid IP format, required |
| type | mock-cpanel, mock-vps, or mock-cloud |
| status | active, offline, or maintenance |
| tags | Array of strings, max 50 chars each |
| groupId | Valid UUID |
| domain | Valid domain format |
| username | Alphanumeric, 3-32 chars |
| password | 8-64 characters |
| diskLimitMB | 256-1048576 |
| bandwidthLimitMB | 1024-10485760 |
| databaseLimit | 1-100 |
| emailLimit | 1-1000 |

## Authentication

All endpoints require:
- Valid admin/superadmin JWT token in Authorization header
- Admin portal access guard
- Not available to regular clients

## Rate Limiting

None currently, but recommended limits:
- 100 requests/minute per IP
- 10 requests/minute for expensive operations (test, create, delete)

## Pagination

Not implemented, but can be added:
- Query: `?page=1&limit=50`
- Response: `{ data: [], total: number, page: number, limit: number }`

## Caching Strategy

**Recommended React Query Configuration**:
- List queries: 30 second stale time
- Detail queries: 60 second stale time
- Mutations: Immediate refetch on success
- Background refetch: 5 minute stale time

## Example Usage

### Create Server with Error Handling
```javascript
try {
  const server = await ServersAPI.createServer({
    name: "Production Server",
    hostname: "prod.example.com",
    ipAddress: "192.168.1.1",
    type: "mock-cpanel",
    capabilities: {
      ssl: true,
      backups: true,
      docker: true,
      nodejs: true,
      python: true,
      email: true
    }
  })
} catch (error) {
  console.error(error.message)
}
```

### Fetch with Filters
```javascript
const servers = await ServersAPI.listServers({
  status: "active",
  type: "mock-vps",
  groupId: "group-id-123"
})
```

### Async Operations
```javascript
const job = await ServersAPI.createAccount(serverId, {
  userId: "user-id",
  domain: "example.com",
  username: "admin",
  password: "secure-password"
})
// Returns { jobId, status: "pending", message: "Account creation queued" }
```
