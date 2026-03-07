// src/modules/support/support.routes.js
// Matches project convention: plain Router export, uses existing middleware

const { Router } = require("express");
const TicketController = require("./tickets/ticket.controller");
const ChatController   = require("./chats/chat.controller");
const prisma           = require("../../../prisma/index");

/**
 * Mount support routes on the Express app.
 *
 * In your main app/routes file:
 *   const supportRouter = require("./modules/support/support.routes");
 *   app.use("/support", supportRouter(authenticate, authorizeRoles));
 *
 * @param {Function} authenticate    - existing JWT middleware (populates req.user)
 * @param {Function} authorizeRoles  - existing RBAC factory, e.g. authorizeRoles("admin","staff")
 */
function createSupportRouter(authenticate, authorizeRoles) {
  const router = Router();

  // Shorthand helpers
  const auth  = authenticate;
  const staff = authorizeRoles("admin", "superadmin", "staff", "support");
  const admin = authorizeRoles("admin", "superadmin");

  // ================================================================
  // DEPARTMENTS (public list for forms)
  // ================================================================

  router.get("/departments", auth, async (req, res) => {
    try {
      const depts = await prisma.ticketDepartment.findMany({
        where: { active: true },
        select: { id: true, name: true, slug: true, description: true },
        orderBy: { name: "asc" },
      });
      res.json({ success: true, data: depts });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ================================================================
  // TICKETS
  // ================================================================

  // POST   /support/tickets              — any authenticated user
  router.post("/tickets", auth, TicketController.create);

  // GET    /support/tickets              — clients see own; staff see all
  router.get("/tickets", auth, TicketController.list);

  // GET    /support/tickets/stats        — staff only
  router.get("/tickets/stats", auth, staff, TicketController.getStats);

  // GET    /support/tickets/:id
  router.get("/tickets/:id", auth, TicketController.get);

  // POST   /support/tickets/:id/reply
  router.post("/tickets/:id/reply", auth, TicketController.addReply);

  // POST   /support/tickets/:id/close
  router.post("/tickets/:id/close", auth, TicketController.close);

  // POST   /support/tickets/:id/reopen
  router.post("/tickets/:id/reopen", auth, TicketController.reopen);

  // PUT    /support/tickets/:id/assign   — staff only
  router.put("/tickets/:id/assign", auth, staff, TicketController.assign);

  // PUT    /support/tickets/:id/status   — staff only
  router.put("/tickets/:id/status", auth, staff, TicketController.changeStatus);

  // PUT    /support/tickets/:id/priority — staff only
  router.put("/tickets/:id/priority", auth, staff, TicketController.changePriority);

  // PUT    /support/tickets/:id/transfer — staff only
  router.put("/tickets/:id/transfer", auth, staff, TicketController.transfer);

  // ================================================================
  // CHAT (REST — real-time is handled by Socket.io in chat.gateway.js)
  // ================================================================

  // POST   /support/chat/sessions              — any authenticated user
  router.post("/chat/sessions", auth, ChatController.startChat);

  // GET    /support/chat/queue                 — staff only (waiting sessions)
  router.get("/chat/queue", auth, staff, ChatController.getWaitingQueue);

  // GET    /support/chat/my-sessions           — staff only (agent's active sessions)
  router.get("/chat/my-sessions", auth, staff, ChatController.getMyActiveSessions);

  // PUT    /support/chat/availability          — staff only
  router.put("/chat/availability", auth, staff, ChatController.setAvailability);

  // GET    /support/chat/sessions/:sessionId
  router.get("/chat/sessions/:sessionId", auth, ChatController.getSession);

  // GET    /support/chat/sessions/:sessionId/transcript
  router.get("/chat/sessions/:sessionId/transcript", auth, ChatController.getTranscript);

  // POST   /support/chat/sessions/:sessionId/message   (REST fallback)
  router.post("/chat/sessions/:sessionId/message", auth, ChatController.sendMessage);

  // POST   /support/chat/sessions/:sessionId/end
  router.post("/chat/sessions/:sessionId/end", auth, ChatController.endChat);

  // POST   /support/chat/sessions/:sessionId/rate
  router.post("/chat/sessions/:sessionId/rate", auth, ChatController.rateSession);

  // POST   /support/chat/sessions/:sessionId/convert   — staff only
  router.post("/chat/sessions/:sessionId/convert", auth, staff, ChatController.convertToTicket);

  // POST   /support/chat/sessions/:sessionId/join      — staff only
  router.post("/chat/sessions/:sessionId/join", auth, staff, ChatController.agentJoin);

  // POST   /support/chat/sessions/:sessionId/leave     — staff only
  router.post("/chat/sessions/:sessionId/leave", auth, staff, ChatController.agentLeave);

  return router;
}

module.exports = createSupportRouter;
