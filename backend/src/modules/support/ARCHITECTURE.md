# Support & Live Chat Module — Architecture Reference

## 1. Folder Structure

```
modules/support/
│
├── index.js                          ← Module bootstrap & DI wiring
├── support.controller.js             ← HTTP handlers (thin layer)
├── support.routes.js                 ← Express route definitions
├── support.events.js                 ← Event constants + emitter factory
│
├── tickets/
│   ├── ticket.service.js             ← All ticket business logic
│   └── ticket.repository.js          ← Prisma queries for tickets
│
├── chat/
│   ├── chat.service.js               ← Chat business logic
│   ├── chat.repository.js            ← Prisma queries for chat
│   └── chat.gateway.js               ← Socket.io real-time gateway
│
├── departments/
│   └── department.service.js
│
├── attachments/
│   └── attachment.service.js         ← Storage abstraction layer
│
├── automation/
│   └── automation.registry.js        ← Extension point: automation rules
│
└── extensions/
    ├── notification.registry.js      ← Extension point: notification providers
    └── plugins/
        ├── slack.plugin.js           ← Example: Slack notifications
        └── ai-responder.plugin.js    ← Example: AI reply suggestions
```

---

## 2. Database Schema Summary

### New models added to schema.prisma

| Model                  | Purpose                                      |
|------------------------|----------------------------------------------|
| `TicketDepartment`     | Support departments with SLA config          |
| `TicketDepartmentAgent`| M2M: which staff belong to which dept        |
| `Ticket`               | Full ticket (replaces basic model)           |
| `TicketReply`          | Public replies + internal staff notes        |
| `TicketAttachment`     | Files attached to tickets or replies         |
| `TicketStatusHistory`  | Full audit trail of every status/priority change |
| `ChatSession`          | A live chat session                          |
| `ChatSessionAgent`     | Which agents participated in a session       |
| `ChatMessage`          | Persistent transcript storage                |
| `ChatAgent`            | Agent availability / capacity config         |

### Migration note

The existing basic `Ticket` model must be removed and replaced with
the new schema. Add a migration:

```bash
# 1. Generate the migration
npx prisma migrate dev --name add_support_module

# 2. The migration must also create the ticket number sequence:
# In the generated SQL file, add:
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1;
```

Add these relations to the `User` model in schema.prisma:
```prisma
tickets              Ticket[]
ticketReplies        TicketReply[]
assignedTickets      Ticket[]         @relation("AssignedStaff")
chatSessions         ChatSession[]
chatSessionAgents    ChatSessionAgent[]
chatAgent            ChatAgent?
uploadedAttachments  TicketAttachment[]
statusChanges        TicketStatusHistory[]
chatMessages         ChatMessage[]
departmentMemberships TicketDepartmentAgent[]
```

---

## 3. Module Architecture — Layer Responsibilities

```
HTTP Request
    │
    ▼
support.routes.js          ← Route definition, middleware chain
    │
    ▼
support.controller.js      ← Input extraction, response formatting
    │                         NO business logic
    ▼
ticket.service.js           ← ALL business rules
chat.service.js             ← Validates, orchestrates, emits events
    │
    ▼
ticket.repository.js        ← Prisma queries ONLY
chat.repository.js          ← No logic — just DB access
    │
    ▼
PostgreSQL (via Prisma)

Parallel:
support.events.js  ──→  Platform EventBus  ──→  NotificationRegistry
                                           ──→  AutomationRegistry
                                           ──→  WorkflowTriggerRule (existing)

WebSocket:
Socket.io Client  ──→  chat.gateway.js  ──→  chat.service.js
```

---

## 4. REST API Reference

### Tickets

| Method | Endpoint                           | Auth  | Description                        |
|--------|------------------------------------|-------|------------------------------------|
| POST   | /support/tickets                   | Any   | Create ticket (+ file uploads)     |
| GET    | /support/tickets                   | Any   | List (clients see own only)        |
| GET    | /support/tickets/stats             | Staff | Aggregated stats by status/priority|
| GET    | /support/tickets/:id               | Any   | Get single ticket                  |
| POST   | /support/tickets/:id/reply         | Any   | Add reply (staff can add notes)    |
| POST   | /support/tickets/:id/close         | Any   | Close ticket                       |
| POST   | /support/tickets/:id/reopen        | Any   | Reopen closed ticket               |
| PUT    | /support/tickets/:id/assign        | Staff | Assign to staff member             |
| PUT    | /support/tickets/:id/status        | Staff | Change status                      |
| PUT    | /support/tickets/:id/priority      | Staff | Change priority                    |
| PUT    | /support/tickets/:id/transfer      | Staff | Transfer to another department     |

### Departments

| Method | Endpoint                    | Auth  | Description         |
|--------|-----------------------------|-------|---------------------|
| GET    | /support/departments        | Any   | List active depts   |
| POST   | /support/departments        | Admin | Create department   |
| PUT    | /support/departments/:id    | Admin | Update department   |

### Chat

| Method | Endpoint                                     | Auth  | Description                    |
|--------|----------------------------------------------|-------|--------------------------------|
| POST   | /support/chat/sessions                       | Any   | Start a chat session           |
| GET    | /support/chat/sessions/:id                   | Any   | Get session details            |
| GET    | /support/chat/sessions/:id/transcript        | Any   | Full message history           |
| POST   | /support/chat/sessions/:id/message           | Any   | Send message (REST fallback)   |
| POST   | /support/chat/sessions/:id/end               | Any   | End the chat                   |
| POST   | /support/chat/sessions/:id/rate              | Client| Rate the session (1-5)         |
| POST   | /support/chat/sessions/:id/convert           | Staff | Convert chat to ticket         |
| POST   | /support/chat/sessions/:id/join              | Staff | Agent joins session            |
| POST   | /support/chat/sessions/:id/leave             | Staff | Agent leaves session           |
| GET    | /support/chat/queue                          | Staff | View waiting chat queue        |
| PUT    | /support/chat/availability                   | Staff | Set agent availability         |

---

## 5. WebSocket Architecture (Socket.io)

### Namespace
```
/support/chat
```

### Rooms
- `chat:{sessionId}` — all participants of a session
- `dept:{departmentId}` — all online agents in a department (for queue updates)

### Authentication
Every connection requires a valid JWT passed as:
```js
socket.auth = { token: 'Bearer ...' }
// or as query param:
?token=...
```

### Event Flow — New Chat

```
Client                    Server                    Agent(s)
  │                         │                          │
  │── chat:join ──────────► │                          │
  │◄─ chat:joined ──────────│                          │
  │                         │── queue:update ─────────►│
  │                         │                          │
  │                         │◄── agent:join ───────────│
  │◄─ chat:agent_joined ────│                          │
  │                         │─── chat:agent_joined ───►│
  │                         │                          │
  │── chat:message ────────►│                          │
  │                         │─── chat:message ────────►│
  │◄─ chat:message ─────────│                          │
  │                         │                          │
  │                         │◄── chat:message ─────────│
  │◄─ chat:message ─────────│                          │
  │                         │                          │
  │── chat:end ────────────►│                          │
  │◄─ chat:ended ───────────│                          │
  │                         │─── chat:ended ──────────►│
```

### Typing Indicators (ephemeral — never persisted)
```js
// Client → Server (not broadcast back to sender)
socket.emit('chat:typing',      { sessionId });
socket.emit('chat:stop_typing', { sessionId });

// Server → Other participants
socket.to(`chat:${sessionId}`).emit('chat:typing',      { userId });
socket.to(`chat:${sessionId}`).emit('chat:stop_typing', { userId });
```

---

## 6. Event System Integration

### Emitted Events
```
ticket.created          ticket.reply_added      ticket.status_changed
ticket.priority_changed ticket.assigned         ticket.transferred
ticket.closed           ticket.reopened         ticket.sla_breached
chat.started            chat.agent_joined       chat.agent_left
chat.message_sent       chat.ended              chat.converted_to_ticket
chat.missed
```

### Integration with existing AutomationWorkflow system
The platform's `WorkflowTriggerRule` table stores `eventType` — all
support events are valid trigger values. No code changes needed;
just create a `WorkflowTriggerRule` row with `eventType = 'ticket.created'`
and the workflow will fire automatically.

### Subscribing from another module
```js
const { SUPPORT_EVENTS, onSupportEvent } = require('../support/support.events');

// In your module's bootstrap:
onSupportEvent(eventBus, SUPPORT_EVENTS.TICKET_CREATED, async ({ ticket, client }) => {
  await billingModule.createCreditForSupport(client.id);
});
```

---

## 7. Plugin Extension Points

### Adding a Notification Provider
```js
const { createProvider } = require('./modules/support/extensions/plugins/slack.plugin');

// In app bootstrap (after support module registers):
supportModule.notificationRegistry.registerProvider(
  createProvider({
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
    events: ['ticket.created', 'ticket.sla_breached', 'chat.missed'],
  })
);
```

### Adding an Automation Rule
```js
supportModule.automationRegistry.register({
  id:       'auto-assign-billing-tickets',
  name:     'Auto-assign billing keywords to billing department',
  trigger:  'ticket.created',
  priority: 10,

  async condition({ ticket }) {
    const billingKeywords = ['invoice', 'payment', 'billing', 'refund'];
    return billingKeywords.some(kw =>
      ticket.subject.toLowerCase().includes(kw)
    );
  },

  async action({ ticket }, { ticketService }) {
    const billingDeptId = process.env.BILLING_DEPT_ID;
    await ticketService.transferDepartment(ticket.id, billingDeptId, 'system');
  },
});
```

### Installing the AI Responder Plugin
```js
const aiPlugin = require('./modules/support/extensions/plugins/ai-responder.plugin');

aiPlugin.install(supportModule, {
  apiKey:         process.env.OPENAI_API_KEY,
  model:          'gpt-4o-mini',
  postAsInternal: true,
  minPriority:    'high',
});
```

---

## 8. Application Bootstrap (server.js)

```js
const express     = require('express');
const { Server }  = require('socket.io');
const http        = require('http');
const { PrismaClient } = require('@prisma/client');

const supportModule = require('./modules/support');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });
const prisma = new PrismaClient();

// Register support module
const support = supportModule.register(app, {
  prisma,
  eventBus,       // your platform's event bus instance
  io,
  middleware: {
    authenticate,
    authorize,
    asyncHandler,
    upload: multer({ storage: multer.memoryStorage() }),
  },
  storageDriver,  // your S3 / local storage driver
});

// Optionally install plugins
const slackPlugin = require('./modules/support/extensions/plugins/slack.plugin');
support.notificationRegistry.registerProvider(
  slackPlugin.createProvider({ webhookUrl: process.env.SLACK_WEBHOOK_URL })
);
```

---

## 9. Scaling Considerations

### Database
- All foreign keys and filter columns are indexed (see schema)
- `ticket_number_seq` uses a PostgreSQL sequence — safe under concurrency
- Consider partitioning `chat_messages` by `session_id` for very high volume
- Add `pg_trgm` GIN index on `subject` for full-text ticket search:
  ```sql
  CREATE INDEX tickets_subject_gin ON tickets USING gin(subject gin_trgm_ops);
  ```

### WebSocket horizontal scaling
For multi-instance deployments, use `socket.io-redis` adapter:
```js
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient }  = require('redis');

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```
This ensures `socket.to('chat:xxx').emit(...)` works across all nodes.

### Message queuing
For high-traffic chat, move message persistence off the hot path:
- Emit via socket immediately (optimistic)
- Enqueue to BullMQ/pg-boss for DB write
- Use Postgres `LISTEN/NOTIFY` as a fallback for missed socket events

### SLA checker
Run `ticketService.checkSlaBreaches()` as a scheduled job (not in-process):
```js
// With pg-boss or BullMQ cron:
boss.schedule('sla-check', '*/5 * * * *', {});
boss.work('sla-check', async () => {
  await support.ticketService.checkSlaBreaches();
});
```

### Attachments
- Never store files in PostgreSQL
- Use S3 / Cloudflare R2 with pre-signed URLs
- The `AttachmentService` accepts any driver implementing `{ put, delete, signedUrl }`

### Rate limiting
Apply to chat endpoints specifically to prevent spam:
```js
const rateLimit = require('express-rate-limit');
app.use('/support/chat/sessions', rateLimit({ windowMs: 60_000, max: 10 }));
```
