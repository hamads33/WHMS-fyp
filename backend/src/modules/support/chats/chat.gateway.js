// src/modules/support/chat/chat.gateway.js
// Uses project's TokenService for JWT — NOT a standalone verifier.
// Call ChatGateway.attach(io) once after the Socket.io server is created.

const ChatService = require("./chat.service");

// Uses the same token service as the rest of auth
let TokenService;
try {
  TokenService = require("../../auth/services/token.service");
} catch {
  // Fallback path variant
  TokenService = require("../auth/services/token.service");
}

let AuditService;
try {
  AuditService = require("../../auth/services/audit.service");
} catch {
  AuditService = { log: async () => {} };
}

/**
 * Socket.io Namespace: /support/chat
 *
 * ── Client → Server events ──────────────────────────────────────
 *   chat:join           { sessionId }
 *   chat:message        { sessionId, body, metadata? }
 *   chat:typing         { sessionId }
 *   chat:stop_typing    { sessionId }
 *   chat:end            { sessionId }
 *   agent:join          { sessionId }          ← staff only
 *   agent:leave         { sessionId }          ← staff only
 *   agent:online        { departmentId? }      ← staff only
 *   agent:offline       {}                     ← staff only
 *
 * ── Server → Client events ──────────────────────────────────────
 *   chat:joined         { session }
 *   chat:message        { message }
 *   chat:typing         { userId }
 *   chat:stop_typing    { userId }
 *   chat:ended          { sessionId, endedBy }
 *   chat:agent_joined   { agent, session }
 *   chat:agent_left     { agent }
 *   queue:update        { waiting, sessions }  ← staff dept room
 *   error               { message }
 *
 * ── Rooms ───────────────────────────────────────────────────────
 *   chat:{sessionId}    — all participants of a session
 *   dept:{departmentId} — online agents in a department (queue updates)
 */

const ChatGateway = {
  /** @type {import('socket.io').Namespace} */
  nsp: null,

  /**
   * Call once at app startup:
   *   ChatGateway.attach(io);
   *
   * @param {import('socket.io').Server} io
   */
  attach(io) {
    this.nsp = io.of("/support/chat");

    // ── Auth middleware ──────────────────────────────────────────
    this.nsp.use((socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.query?.token;

        if (!token) {
          return next(new Error("Authentication required"));
        }

        // TokenService.verifyAccessToken is the same verifier used by
        // the HTTP authenticate middleware — single source of truth
        const payload = TokenService.verifyAccessToken(
          token.replace(/^Bearer\s+/i, "")
        );

        if (!payload?.userId) {
          return next(new Error("Invalid token"));
        }

        // Attach user context — same shape as req.user in HTTP controllers
        socket.userId    = payload.userId;
        socket.userEmail = payload.email || null;
        socket.roles     = payload.roles || [];

        next();
      } catch {
        next(new Error("Invalid or expired token"));
      }
    });

    // ── Connection handler ───────────────────────────────────────
    this.nsp.on("connection", (socket) => {
      const { userId, userEmail, roles } = socket;

      // ── Staff: go online / offline ───────────────────────────
      if (_isStaff(roles)) {
        socket.on("agent:online", async ({ departmentId } = {}) => {
          try {
            await ChatService.setAgentOnline(userId, true);

            if (departmentId) {
              socket.join(`dept:${departmentId}`);
              await _broadcastQueueUpdate(this.nsp, departmentId);
            }
          } catch (err) {
            socket.emit("error", { message: err.message });
          }
        });

        socket.on("agent:offline", async () => {
          try {
            await ChatService.setAgentOnline(userId, false);
          } catch (err) {
            console.warn("[ChatGateway] agent:offline error:", err.message);
          }
        });
      }

      // On disconnect, mark agent offline
      socket.on("disconnect", async () => {
        if (_isStaff(roles)) {
          await ChatService.setAgentOnline(userId, false).catch(() => {});
        }
      });

      // ── Join a session room ───────────────────────────────────
      socket.on("chat:join", async ({ sessionId }) => {
        try {
          const session = await ChatService.getSession(sessionId, userId, roles);
          socket.join(`chat:${sessionId}`);
          socket.emit("chat:joined", { session });
        } catch (err) {
          socket.emit("error", { message: err.message });
        }
      });

      // ── Staff: join a session as agent ───────────────────────
      socket.on("agent:join", async ({ sessionId }) => {
        if (!_isStaff(roles)) {
          return socket.emit("error", { message: "Forbidden" });
        }
        try {
          const session = await ChatService.agentJoin(sessionId, userId);
          socket.join(`chat:${sessionId}`);

          this.nsp.to(`chat:${sessionId}`).emit("chat:agent_joined", {
            agent: { id: userId, email: userEmail },
            session,
          });

          if (session.departmentId) {
            await _broadcastQueueUpdate(this.nsp, session.departmentId);
          }
        } catch (err) {
          socket.emit("error", { message: err.message });
        }
      });

      // ── Staff: leave a session ────────────────────────────────
      socket.on("agent:leave", async ({ sessionId }) => {
        try {
          const session = await ChatService.agentLeave(sessionId, userId);
          socket.leave(`chat:${sessionId}`);

          this.nsp.to(`chat:${sessionId}`).emit("chat:agent_left", {
            agent: { id: userId, email: userEmail },
          });

          if (session.departmentId) {
            await _broadcastQueueUpdate(this.nsp, session.departmentId);
          }
        } catch (err) {
          socket.emit("error", { message: err.message });
        }
      });

      // ── Send a message ────────────────────────────────────────
      socket.on("chat:message", async ({ sessionId, body, metadata }) => {
        if (!body?.trim()) return;

        try {
          const message = await ChatService.sendMessage({
            sessionId,
            senderId: userId,
            body,
            metadata: metadata || null,
          });

          // Broadcast to ALL room participants (including sender)
          this.nsp.to(`chat:${sessionId}`).emit("chat:message", { message });
        } catch (err) {
          socket.emit("error", { message: err.message });
        }
      });

      // ── Typing indicators (ephemeral, never persisted) ────────
      socket.on("chat:typing", ({ sessionId }) => {
        socket.to(`chat:${sessionId}`).emit("chat:typing", { userId });
      });

      socket.on("chat:stop_typing", ({ sessionId }) => {
        socket.to(`chat:${sessionId}`).emit("chat:stop_typing", { userId });
      });

      // ── End chat ──────────────────────────────────────────────
      socket.on("chat:end", async ({ sessionId }) => {
        try {
          await ChatService.endChat(sessionId, userId);

          this.nsp.to(`chat:${sessionId}`).emit("chat:ended", {
            sessionId,
            endedBy: { id: userId, email: userEmail },
          });

          const session = await ChatService.getSession(sessionId, userId, roles).catch(() => null);
          if (session?.departmentId) {
            await _broadcastQueueUpdate(this.nsp, session.departmentId);
          }
        } catch (err) {
          socket.emit("error", { message: err.message });
        }
      });
    });

    console.log("[ChatGateway] Attached to /support/chat namespace");
    return this;
  },

  /**
   * Push a message from outside the gateway (e.g. an AI bot plugin).
   * @param {string} sessionId
   * @param {object} message
   */
  pushMessage(sessionId, message) {
    if (!this.nsp) return;
    this.nsp.to(`chat:${sessionId}`).emit("chat:message", { message });
  },
};

// ── Private helpers ──────────────────────────────────────────────

function _isStaff(roles = []) {
  return (
    roles.includes("admin") ||
    roles.includes("superadmin") ||
    roles.includes("staff") ||
    roles.includes("support")
  );
}

async function _broadcastQueueUpdate(nsp, departmentId) {
  if (!departmentId) return;
  try {
    const sessions = await ChatService.getWaitingQueue(departmentId);
    nsp.to(`dept:${departmentId}`).emit("queue:update", {
      waiting: sessions.length,
      sessions,
    });
  } catch (err) {
    console.warn("[ChatGateway] queue broadcast failed:", err.message);
  }
}

module.exports = ChatGateway;
