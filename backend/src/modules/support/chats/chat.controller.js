// src/modules/support/chat/chat.controller.js
// Matches project pattern: static class, try/catch per method, res.status().json()

const ChatService = require("./chat.service");

class ChatController {
  // ──────────────────────────────────────────────────────
  // POST /support/chat/sessions
  // Client starts a new chat session
  // ──────────────────────────────────────────────────────
  static async startChat(req, res) {
    try {
      const { departmentId, subject } = req.body;

      const session = await ChatService.startChat({
        clientId: req.user.id,
        departmentId: departmentId || null,
        subject: subject || null,
      });

      return res.status(201).json({ success: true, session });
    } catch (err) {
      console.error("CHAT START ERROR:", err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // GET /support/chat/sessions/:sessionId
  // ──────────────────────────────────────────────────────
  static async getSession(req, res) {
    try {
      const { sessionId } = req.params;

      const session = await ChatService.getSession(
        sessionId,
        req.user.id,
        req.user.roles
      );

      return res.json({ success: true, session });
    } catch (err) {
      console.error("CHAT GET SESSION ERROR:", err.message);
      const status = err.message === "Access denied" ? 403
        : err.message === "Chat session not found" ? 404
        : 400;
      return res.status(status).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // GET /support/chat/sessions/:sessionId/transcript
  // ──────────────────────────────────────────────────────
  static async getTranscript(req, res) {
    try {
      const { sessionId } = req.params;

      // Verify access before returning transcript
      await ChatService.getSession(sessionId, req.user.id, req.user.roles);

      const messages = await ChatService.getTranscript(sessionId);

      return res.json({ success: true, messages });
    } catch (err) {
      console.error("CHAT TRANSCRIPT ERROR:", err.message);
      const status = err.message === "Access denied" ? 403 : 400;
      return res.status(status).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // POST /support/chat/sessions/:sessionId/message
  // REST fallback for sending a message (WebSocket preferred)
  // ──────────────────────────────────────────────────────
  static async sendMessage(req, res) {
    try {
      const { sessionId } = req.params;
      const { body, metadata } = req.body;

      if (!body || !body.trim()) {
        return res.status(400).json({ error: "Message body is required" });
      }

      const message = await ChatService.sendMessage({
        sessionId,
        senderId: req.user.id,
        body,
        metadata: metadata || null,
      });

      return res.status(201).json({ success: true, message });
    } catch (err) {
      console.error("CHAT SEND MESSAGE ERROR:", err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // POST /support/chat/sessions/:sessionId/end
  // ──────────────────────────────────────────────────────
  static async endChat(req, res) {
    try {
      const { sessionId } = req.params;

      const session = await ChatService.endChat(sessionId, req.user.id);

      return res.json({ success: true, session });
    } catch (err) {
      console.error("CHAT END ERROR:", err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // POST /support/chat/sessions/:sessionId/rate
  // Client rates the session after it ends
  // ──────────────────────────────────────────────────────
  static async rateSession(req, res) {
    try {
      const { sessionId } = req.params;
      const { rating, feedback } = req.body;

      if (!rating) {
        return res.status(400).json({ error: "rating is required" });
      }

      const session = await ChatService.rateSession(
        sessionId,
        req.user.id,
        Number(rating),
        feedback || null
      );

      return res.json({ success: true, session });
    } catch (err) {
      console.error("CHAT RATE ERROR:", err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // POST /support/chat/sessions/:sessionId/convert
  // Staff converts a chat to a support ticket
  // ──────────────────────────────────────────────────────
  static async convertToTicket(req, res) {
    try {
      const { sessionId } = req.params;
      const { departmentId, subject, priority } = req.body;

      const ticket = await ChatService.convertToTicket(
        sessionId,
        req.user.id,
        { departmentId, subject, priority }
      );

      return res.status(201).json({ success: true, ticket });
    } catch (err) {
      console.error("CHAT CONVERT ERROR:", err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // POST /support/chat/sessions/:sessionId/join   [staff]
  // ──────────────────────────────────────────────────────
  static async agentJoin(req, res) {
    try {
      const { sessionId } = req.params;

      const session = await ChatService.agentJoin(sessionId, req.user.id);

      return res.json({ success: true, session });
    } catch (err) {
      console.error("CHAT AGENT JOIN ERROR:", err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // POST /support/chat/sessions/:sessionId/leave  [staff]
  // ──────────────────────────────────────────────────────
  static async agentLeave(req, res) {
    try {
      const { sessionId } = req.params;

      const session = await ChatService.agentLeave(sessionId, req.user.id);

      return res.json({ success: true, session });
    } catch (err) {
      console.error("CHAT AGENT LEAVE ERROR:", err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // GET /support/chat/queue  [staff]
  // See all sessions waiting for an agent
  // ──────────────────────────────────────────────────────
  static async getWaitingQueue(req, res) {
    try {
      const { departmentId } = req.query;

      const sessions = await ChatService.getWaitingQueue(departmentId || null);

      return res.json({ success: true, sessions, count: sessions.length });
    } catch (err) {
      console.error("CHAT QUEUE ERROR:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // GET /support/chat/my-sessions  [staff]
  // Active sessions assigned to the requesting agent
  // ──────────────────────────────────────────────────────
  static async getMyActiveSessions(req, res) {
    try {
      const sessions = await ChatService.getAgentActiveSessions(req.user.id);

      return res.json({ success: true, sessions });
    } catch (err) {
      console.error("CHAT MY SESSIONS ERROR:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // PUT /support/chat/availability  [staff]
  // Toggle accepting chats / change max concurrent
  // ──────────────────────────────────────────────────────
  static async setAvailability(req, res) {
    try {
      const { acceptingChats, maxConcurrentChats } = req.body;

      const agent = await ChatService.updateAgentAvailability(req.user.id, {
        acceptingChats,
        maxConcurrentChats: maxConcurrentChats ? Number(maxConcurrentChats) : undefined,
      });

      return res.json({ success: true, agent });
    } catch (err) {
      console.error("CHAT AVAILABILITY ERROR:", err.message);
      return res.status(400).json({ error: err.message });
    }
  }
}

module.exports = ChatController;
