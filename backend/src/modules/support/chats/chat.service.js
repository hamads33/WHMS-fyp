// src/modules/support/chat/chat.service.js
// Matches project pattern: plain object, direct requires, AuditService + Webhook

const ChatRepository = require("./chat.repository");
const AuditService = require("../../auth/services/audit.service");

// Webhook emitter – safe fallback (same pattern as auth.service.js)
let Webhook = { emit: async () => {} };
try {
  Webhook = require("../../../module/services/webhook.service");
} catch {
  try {
    Webhook = require("../../module/services/webhook.service");
  } catch {
    Webhook = { emit: async () => {} };
  }
}

const ChatService = {
  // ──────────────────────────────────────────────────────
  // CLIENT: Start a new chat session
  // ──────────────────────────────────────────────────────

  async startChat({ clientId, departmentId, subject }) {
    const session = await ChatRepository.createSession({
      clientId,
      departmentId,
      subject,
    });

    // System message so the transcript always has a starting point
    await ChatRepository.createMessage({
      sessionId: session.id,
      senderId: clientId,
      type: "system",
      body: "Chat session started. Waiting for an agent to join…",
    });

    await AuditService.log({
      userId: clientId,
      action: "chat.started",
      entity: "chat_session",
      entityId: session.id,
    });

    try {
      await Webhook.emit("support.chat.started", {
        sessionId: session.id,
        sessionCode: session.sessionCode,
        clientId,
      });
    } catch (err) {
      console.warn("Webhook emit (support.chat.started) failed:", err?.message);
    }

    // Auto-assign an available agent if one exists right now
    await ChatService._tryAutoAssign(session);

    // Re-fetch to include any agent that just joined
    return ChatRepository.findSessionById(session.id);
  },

  // ──────────────────────────────────────────────────────
  // Send a message (client or agent)
  // ──────────────────────────────────────────────────────

  async sendMessage({ sessionId, senderId, body, metadata }) {
    const session = await ChatService._assertActiveSession(sessionId, senderId);

    const message = await ChatRepository.createMessage({
      sessionId,
      senderId,
      type: "text",
      body: body.trim(),
      metadata,
    });

    try {
      await Webhook.emit("support.chat.message_sent", {
        sessionId,
        messageId: message.id,
        senderId,
      });
    } catch (err) {
      console.warn("Webhook emit (support.chat.message_sent) failed:", err?.message);
    }

    return message;
  },

  // ──────────────────────────────────────────────────────
  // End the chat (client or agent)
  // ──────────────────────────────────────────────────────

  async endChat(sessionId, endedById) {
    const session = await ChatService._assertSessionExists(sessionId);

    if (session.status === "ended") {
      throw new Error("Chat session has already ended");
    }

    await ChatRepository.updateSession(sessionId, {
      status: "ended",
      endedAt: new Date(),
    });

    await ChatRepository.createMessage({
      sessionId,
      senderId: endedById,
      type: "system",
      body: "Chat ended.",
    });

    // Release capacity for all active agents
    for (const sa of session.agents.filter((a) => !a.leftAt)) {
      await ChatRepository.decrementAgentChatCount(sa.agentId);
      await ChatRepository.removeAgentFromSession(sessionId, sa.agentId);
    }

    await AuditService.log({
      userId: endedById,
      action: "chat.ended",
      entity: "chat_session",
      entityId: sessionId,
    });

    try {
      await Webhook.emit("support.chat.ended", { sessionId, endedById });
    } catch (err) {
      console.warn("Webhook emit (support.chat.ended) failed:", err?.message);
    }

    return ChatRepository.findSessionById(sessionId);
  },

  // ──────────────────────────────────────────────────────
  // Rate a completed session (client only)
  // ──────────────────────────────────────────────────────

  async rateSession(sessionId, clientId, rating, feedback) {
    const session = await ChatService._assertSessionExists(sessionId);

    if (session.clientId !== clientId) {
      throw new Error("Access denied");
    }
    if (session.status !== "ended") {
      throw new Error("Session must be ended before rating");
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error("Rating must be an integer between 1 and 5");
    }

    return ChatRepository.updateSession(sessionId, { rating, feedback: feedback || null });
  },

  // ──────────────────────────────────────────────────────
  // STAFF: Agent joins a session
  // ──────────────────────────────────────────────────────

  async agentJoin(sessionId, agentId) {
    const session = await ChatService._assertSessionExists(sessionId);

    if (session.status === "ended") {
      throw new Error("Cannot join an ended chat session");
    }

    // First agent to join is the primary
    const isPrimary = session.status === "waiting";

    await Promise.all([
      ChatRepository.addAgentToSession(sessionId, agentId, isPrimary),
      ChatRepository.incrementAgentChatCount(agentId),
      ChatRepository.updateSession(sessionId, {
        status: "active",
        agentJoinedAt: session.agentJoinedAt ?? new Date(),
      }),
    ]);

    await ChatRepository.createMessage({
      sessionId,
      senderId: agentId,
      type: "system",
      body: "An agent has joined the chat.",
    });

    await AuditService.log({
      userId: agentId,
      action: "chat.agent_joined",
      entity: "chat_session",
      entityId: sessionId,
    });

    try {
      await Webhook.emit("support.chat.agent_joined", { sessionId, agentId });
    } catch (err) {
      console.warn("Webhook emit (support.chat.agent_joined) failed:", err?.message);
    }

    return ChatRepository.findSessionById(sessionId);
  },

  // ──────────────────────────────────────────────────────
  // STAFF: Agent leaves (without ending session)
  // ──────────────────────────────────────────────────────

  async agentLeave(sessionId, agentId) {
    await Promise.all([
      ChatRepository.removeAgentFromSession(sessionId, agentId),
      ChatRepository.decrementAgentChatCount(agentId),
      ChatRepository.createMessage({
        sessionId,
        senderId: agentId,
        type: "system",
        body: "Agent has left the chat.",
      }),
    ]);

    const session = await ChatRepository.findSessionById(sessionId);

    // If no active agents remain, revert to waiting
    const stillActive = session.agents.filter((a) => !a.leftAt);
    if (stillActive.length === 0) {
      await ChatRepository.updateSession(sessionId, { status: "waiting" });
    }

    await AuditService.log({
      userId: agentId,
      action: "chat.agent_left",
      entity: "chat_session",
      entityId: sessionId,
    });

    return ChatRepository.findSessionById(sessionId);
  },

  // ──────────────────────────────────────────────────────
  // STAFF: Convert chat → support ticket
  // ──────────────────────────────────────────────────────

  async convertToTicket(sessionId, agentId, options = {}) {
    const session = await ChatService._assertSessionExists(sessionId);

    if (session.convertedToTicketId) {
      throw new Error("This chat session has already been converted to a ticket");
    }

    // Lazy-require to avoid circular deps
    const TicketService = require("../tickets/ticket.service");

    // Build transcript body
    const messages = await ChatRepository.getTranscript(sessionId);
    const lines = messages
      .filter((m) => m.type === "text")
      .map(
        (m) =>
          `**${m.sender.email}** [${new Date(m.sentAt).toISOString()}]:\n${m.body}`
      )
      .join("\n\n---\n\n");

    const body = `*Converted from chat session ${session.sessionCode}.*\n\n${lines}`;

    const ticket = await TicketService.createTicket({
      clientId: session.clientId,
      departmentId: options.departmentId || session.departmentId,
      subject:
        options.subject || session.subject || `Chat ${session.sessionCode}`,
      body,
      priority: options.priority || "medium",
    });

    await ChatRepository.updateSession(sessionId, {
      convertedToTicketId: ticket.id,
    });

    await AuditService.log({
      userId: agentId,
      action: "chat.converted_to_ticket",
      entity: "chat_session",
      entityId: sessionId,
      data: { ticketId: ticket.id },
    });

    try {
      await Webhook.emit("support.chat.converted_to_ticket", {
        sessionId,
        ticketId: ticket.id,
      });
    } catch (err) {
      console.warn("Webhook emit (support.chat.converted_to_ticket) failed:", err?.message);
    }

    return ticket;
  },

  // ──────────────────────────────────────────────────────
  // QUERIES
  // ──────────────────────────────────────────────────────

  async getSession(sessionId, requesterId, requesterRoles = []) {
    const session = await ChatService._assertSessionExists(sessionId);

    const isStaff = ChatService._isStaff(requesterRoles);
    const isOwner = session.clientId === requesterId;
    const isAgent = session.agents.some((a) => a.agentId === requesterId);

    if (!isStaff && !isOwner && !isAgent) {
      throw new Error("Access denied");
    }

    return session;
  },

  async getTranscript(sessionId) {
    return ChatRepository.getTranscript(sessionId);
  },

  async getWaitingQueue(departmentId) {
    return ChatRepository.findWaitingSessions(departmentId || undefined);
  },

  async getAgentActiveSessions(agentId) {
    return ChatRepository.findAgentActiveSessions(agentId);
  },

  // ──────────────────────────────────────────────────────
  // AGENT AVAILABILITY
  // ──────────────────────────────────────────────────────

  async setAgentOnline(agentId, isOnline) {
    return ChatRepository.setAgentOnline(agentId, isOnline);
  },

  async updateAgentAvailability(agentId, { acceptingChats, maxConcurrentChats }) {
    return ChatRepository.upsertAgentAvailability(agentId, {
      ...(acceptingChats !== undefined && { acceptingChats }),
      ...(maxConcurrentChats !== undefined && { maxConcurrentChats }),
    });
  },

  // ──────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────

  async _assertSessionExists(id) {
    const session = await ChatRepository.findSessionById(id);
    if (!session) throw new Error("Chat session not found");
    return session;
  },

  async _assertActiveSession(sessionId, userId) {
    const session = await ChatService._assertSessionExists(sessionId);

    const isParticipant =
      session.clientId === userId ||
      session.agents.some((a) => a.agentId === userId);

    if (!isParticipant) {
      throw new Error("You are not a participant in this chat session");
    }
    if (session.status === "ended") {
      throw new Error("This chat session has ended");
    }

    return session;
  },

  async _tryAutoAssign(session) {
    if (!session.departmentId) return;

    try {
      const agents = await ChatRepository.findAvailableAgents(session.departmentId);
      if (agents.length > 0) {
        await ChatService.agentJoin(session.id, agents[0].id);
      }
    } catch (err) {
      // Auto-assign is best-effort — never block the startChat response
      console.warn("[ChatService] Auto-assign failed:", err.message);
    }
  },

  // Matches req.user.roles flat string array: ['admin', 'staff', ...]
  _isStaff(roles = []) {
    return (
      roles.includes("admin") ||
      roles.includes("superadmin") ||
      roles.includes("staff") ||
      roles.includes("support")
    );
  },
};

module.exports = ChatService;
