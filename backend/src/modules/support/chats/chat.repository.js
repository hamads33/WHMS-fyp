// src/modules/support/chat/chat.repository.js
// Matches project pattern: plain object, direct prisma import

const prisma = require("../../../../prisma/index");

const SESSION_INCLUDE = {
  client: {
    select: {
      id: true,
      email: true,
      clientProfile: true,
    },
  },
  department: true,
  agents: {
    include: {
      agent: { select: { id: true, email: true } },
    },
  },
  messages: {
    include: {
      sender: { select: { id: true, email: true } },
    },
    orderBy: { sentAt: "asc" },
    take: 50,
  },
};

const ChatRepository = {
  // ──────────────────────────────────────────────────────
  // SESSIONS
  // ──────────────────────────────────────────────────────

  async createSession({ clientId, departmentId, subject }) {
    // Generate a short human-readable session code
    const sessionCode = `CHAT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    return prisma.chatSession.create({
      data: {
        sessionCode,
        clientId,
        departmentId: departmentId || null,
        subject: subject || null,
        status: "waiting",
      },
      include: SESSION_INCLUDE,
    });
  },

  async findSessionById(id) {
    return prisma.chatSession.findUnique({
      where: { id },
      include: SESSION_INCLUDE,
    });
  },

  async findSessionByCode(sessionCode) {
    return prisma.chatSession.findUnique({
      where: { sessionCode },
      include: SESSION_INCLUDE,
    });
  },

  async updateSession(id, data) {
    return prisma.chatSession.update({
      where: { id },
      data,
      include: SESSION_INCLUDE,
    });
  },

  async findWaitingSessions(departmentId) {
    return prisma.chatSession.findMany({
      where: {
        status: "waiting",
        ...(departmentId ? { departmentId } : {}),
      },
      include: SESSION_INCLUDE,
      orderBy: { startedAt: "asc" },
    });
  },

  async findAgentActiveSessions(agentId) {
    return prisma.chatSession.findMany({
      where: {
        status: "active",
        agents: { some: { agentId, leftAt: null } },
      },
      include: SESSION_INCLUDE,
    });
  },

  // ──────────────────────────────────────────────────────
  // SESSION AGENTS
  // ──────────────────────────────────────────────────────

  async addAgentToSession(sessionId, agentId, isPrimary = false) {
    return prisma.chatSessionAgent.upsert({
      where: { sessionId_agentId: { sessionId, agentId } },
      create: { sessionId, agentId, isPrimary },
      update: { leftAt: null },
    });
  },

  async removeAgentFromSession(sessionId, agentId) {
    return prisma.chatSessionAgent.updateMany({
      where: { sessionId, agentId },
      data: { leftAt: new Date() },
    });
  },

  // ──────────────────────────────────────────────────────
  // MESSAGES
  // ──────────────────────────────────────────────────────

  async createMessage({ sessionId, senderId, type = "text", body, metadata }) {
    return prisma.chatMessage.create({
      data: {
        sessionId,
        senderId,
        type,
        body,
        metadata: metadata || undefined,
      },
      include: {
        sender: { select: { id: true, email: true } },
      },
    });
  },

  async findMessagesBySession(sessionId, { limit = 50, before } = {}) {
    return prisma.chatMessage.findMany({
      where: {
        sessionId,
        ...(before ? { sentAt: { lt: before } } : {}),
      },
      include: { sender: { select: { id: true, email: true } } },
      orderBy: { sentAt: "desc" },
      take: limit,
    });
  },

  async getTranscript(sessionId) {
    return prisma.chatMessage.findMany({
      where: { sessionId },
      include: { sender: { select: { id: true, email: true } } },
      orderBy: { sentAt: "asc" },
    });
  },

  // ──────────────────────────────────────────────────────
  // AGENT AVAILABILITY
  // ──────────────────────────────────────────────────────

  async upsertAgentAvailability(userId, data) {
    return prisma.chatAgent.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },

  async setAgentOnline(userId, isOnline) {
    return prisma.chatAgent.upsert({
      where: { userId },
      create: { userId, isOnline, lastSeenAt: new Date() },
      update: { isOnline, lastSeenAt: new Date() },
    });
  },

  /**
   * Find online agents in a given department who still have capacity.
   * Sorted by fewest current chats first (least-busy first).
   */
  async findAvailableAgents(departmentId) {
    const deptAgents = await prisma.ticketDepartmentAgent.findMany({
      where: { departmentId },
      include: {
        user: {
          include: { chatAgent: true },
        },
      },
    });

    return deptAgents
      .map((da) => da.user)
      .filter(
        (u) =>
          u.chatAgent &&
          u.chatAgent.isOnline &&
          u.chatAgent.acceptingChats &&
          u.chatAgent.currentChatCount < u.chatAgent.maxConcurrentChats
      )
      .sort(
        (a, b) => a.chatAgent.currentChatCount - b.chatAgent.currentChatCount
      );
  },

  async incrementAgentChatCount(userId) {
    return prisma.chatAgent.updateMany({
      where: { userId },
      data: { currentChatCount: { increment: 1 } },
    });
  },

  async decrementAgentChatCount(userId) {
    return prisma.chatAgent.updateMany({
      where: { userId, currentChatCount: { gt: 0 } },
      data: { currentChatCount: { decrement: 1 } },
    });
  },
};

module.exports = ChatRepository;
