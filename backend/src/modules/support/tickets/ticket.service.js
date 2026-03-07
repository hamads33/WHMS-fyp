// src/modules/support/tickets/ticket.service.js
// Plain object style matching AuthService pattern

const prisma = require("../../../../prisma/index");
const AuditService = require("../../auth/services/audit.service");

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

const TICKET_INCLUDE = {
  client:     { select: { id: true, email: true, clientProfile: true } },
  assignedTo: { select: { id: true, email: true } },
  department: true,
  replies: {
    include: {
      author:      { select: { id: true, email: true } },
      attachments: true,
    },
    orderBy: { createdAt: "asc" },
  },
  attachments: true,
  statusHistory: {
    include: { changedBy: { select: { id: true, email: true } } },
    orderBy: { createdAt: "desc" },
  },
};

const TicketService = {
  // ──────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────

  async createTicket({ clientId, departmentId, subject, body, priority = "medium", metadata }) {
    // Validate department exists
    const dept = await prisma.ticketDepartment.findUnique({
      where: { id: departmentId },
    });
    if (!dept || !dept.active) {
      throw new Error("Department not found or inactive");
    }

    // Generate sequential ticket number safely
    const ticketNumber = await TicketService._nextTicketNumber();

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        clientId,
        departmentId,
        subject,
        priority,
        status: "open",
        metadata: metadata || undefined,
      },
      include: TICKET_INCLUDE,
    });

    // Opening message becomes first reply
    await prisma.ticketReply.create({
      data: {
        ticketId: ticket.id,
        authorId: clientId,
        type: "public",
        body,
      },
    });

    // Status history entry
    await prisma.ticketStatusHistory.create({
      data: {
        ticketId:   ticket.id,
        changedById: clientId,
        toStatus:   "open",
      },
    });

    await AuditService.log({
      userId:   clientId,
      action:   "ticket.created",
      entity:   "ticket",
      entityId: ticket.id,
      data:     { ticketNumber, subject, departmentId },
    });

    try {
      await Webhook.emit("support.ticket.created", {
        ticketId: ticket.id,
        ticketNumber,
        clientId,
      });
    } catch (err) {
      console.warn("Webhook emit (support.ticket.created) failed:", err?.message);
    }

    return ticket;
  },

  // ──────────────────────────────────────────────────────
  // READ
  // ──────────────────────────────────────────────────────

  async getTicket(id, requesterId, requesterRoles = []) {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: TICKET_INCLUDE,
    });

    if (!ticket) throw new Error("Ticket not found");

    // Clients only see their own tickets
    if (!TicketService._isStaff(requesterRoles) && ticket.clientId !== requesterId) {
      throw new Error("Access denied");
    }

    // Strip internal notes from client view
    if (!TicketService._isStaff(requesterRoles)) {
      ticket.replies = ticket.replies.filter((r) => r.type === "public");
    }

    return ticket;
  },

  async listTickets(filters = {}, pagination = { page: 1, limit: 20 }, requesterId, requesterRoles = []) {
    const { page, limit } = pagination;
    const skip = (Math.max(1, page) - 1) * limit;

    const where = {};

    // Clients only see their own
    if (!TicketService._isStaff(requesterRoles)) {
      where.clientId = requesterId;
    } else {
      if (filters.clientId)     where.clientId     = filters.clientId;
      if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    }

    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.status)       where.status       = filters.status;
    if (filters.priority)     where.priority     = filters.priority;
    if (filters.search) {
      where.OR = [
        { subject:      { contains: filters.search, mode: "insensitive" } },
        { ticketNumber: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ updatedAt: "desc" }],
        include: {
          client:     { select: { id: true, email: true, clientProfile: true } },
          assignedTo: { select: { id: true, email: true } },
          department: true,
          _count: { select: { replies: true } },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    return {
      rows,
      total,
      page:  Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    };
  },

  // ──────────────────────────────────────────────────────
  // REPLY
  // ──────────────────────────────────────────────────────

  async addReply({ ticketId, authorId, body, type = "public", requesterRoles = [] }) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { department: true },
    });
    if (!ticket) throw new Error("Ticket not found");

    if (type === "internal" && !TicketService._isStaff(requesterRoles)) {
      throw new Error("Only staff can add internal notes");
    }

    if (ticket.status === "closed") {
      throw new Error("Cannot reply to a closed ticket. Reopen it first.");
    }

    const reply = await prisma.ticketReply.create({
      data: { ticketId, authorId, type, body },
      include: { author: { select: { id: true, email: true } } },
    });

    // Auto status transition
    const isStaff   = TicketService._isStaff(requesterRoles);
    const newStatus = isStaff ? "waiting_for_client" : "waiting_for_staff";
    const updates   = { status: newStatus };

    if (isStaff && !ticket.firstResponseAt) {
      updates.firstResponseAt = new Date();
    }

    await Promise.all([
      prisma.ticket.update({ where: { id: ticketId }, data: updates }),
      prisma.ticketStatusHistory.create({
        data: {
          ticketId,
          changedById: authorId,
          fromStatus:  ticket.status,
          toStatus:    newStatus,
        },
      }),
    ]);

    try {
      await Webhook.emit("support.ticket.reply_added", {
        ticketId,
        replyId: reply.id,
        authorId,
        type,
      });
    } catch (err) {
      console.warn("Webhook emit (support.ticket.reply_added) failed:", err?.message);
    }

    return reply;
  },

  // ──────────────────────────────────────────────────────
  // STATUS / ASSIGNMENT / PRIORITY
  // ──────────────────────────────────────────────────────

  async changeStatus(ticketId, toStatus, changedById, note = null) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error("Ticket not found");
    if (ticket.status === toStatus) return ticket;

    const updates = { status: toStatus };
    if (toStatus === "closed") {
      updates.closedAt   = new Date();
      updates.resolvedAt = new Date();
    }

    await Promise.all([
      prisma.ticket.update({ where: { id: ticketId }, data: updates }),
      prisma.ticketStatusHistory.create({
        data: {
          ticketId,
          changedById,
          fromStatus: ticket.status,
          toStatus,
          note: note || undefined,
        },
      }),
    ]);

    if (toStatus === "closed") {
      await AuditService.log({
        userId:   changedById,
        action:   "ticket.closed",
        entity:   "ticket",
        entityId: ticketId,
        data:     { note },
      });

      try {
        await Webhook.emit("support.ticket.closed", { ticketId, closedById: changedById });
      } catch (err) {
        console.warn("Webhook emit (support.ticket.closed) failed:", err?.message);
      }
    }

    return { ...ticket, status: toStatus };
  },

  async changePriority(ticketId, toPriority, changedById) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error("Ticket not found");
    if (ticket.priority === toPriority) return ticket;

    await Promise.all([
      prisma.ticket.update({ where: { id: ticketId }, data: { priority: toPriority } }),
      prisma.ticketStatusHistory.create({
        data: {
          ticketId,
          changedById,
          fromStatus:    ticket.status,
          toStatus:      ticket.status,
          fromPriority:  ticket.priority,
          toPriority,
        },
      }),
    ]);

    return { ...ticket, priority: toPriority };
  },

  async assignTicket(ticketId, assignedToId, assignedById) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error("Ticket not found");

    await prisma.ticket.update({ where: { id: ticketId }, data: { assignedToId } });

    await AuditService.log({
      userId:   assignedById,
      action:   "ticket.assigned",
      entity:   "ticket",
      entityId: ticketId,
      data:     { assignedToId },
    });

    try {
      await Webhook.emit("support.ticket.assigned", {
        ticketId,
        assignedToId,
        assignedById,
      });
    } catch (err) {
      console.warn("Webhook emit (support.ticket.assigned) failed:", err?.message);
    }

    return { ...ticket, assignedToId };
  },

  async transferDepartment(ticketId, toDepartmentId, transferredById, note = null) {
    const [ticket, dept] = await Promise.all([
      prisma.ticket.findUnique({ where: { id: ticketId }, include: { department: true } }),
      prisma.ticketDepartment.findUnique({ where: { id: toDepartmentId } }),
    ]);

    if (!ticket) throw new Error("Ticket not found");
    if (!dept || !dept.active) throw new Error("Target department not found or inactive");

    await Promise.all([
      prisma.ticket.update({
        where: { id: ticketId },
        data:  { departmentId: toDepartmentId, assignedToId: null },
      }),
      prisma.ticketStatusHistory.create({
        data: {
          ticketId,
          changedById: transferredById,
          fromStatus:  ticket.status,
          toStatus:    ticket.status,
          note:        note || `Transferred from ${ticket.department.name} to ${dept.name}`,
        },
      }),
    ]);

    return { ...ticket, departmentId: toDepartmentId };
  },

  async closeTicket(ticketId, closedById, resolutionNote = null) {
    return TicketService.changeStatus(ticketId, "closed", closedById, resolutionNote);
  },

  async reopenTicket(ticketId, reopenedById) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error("Ticket not found");
    if (ticket.status !== "closed") throw new Error("Ticket is not closed");

    await Promise.all([
      prisma.ticket.update({
        where: { id: ticketId },
        data:  { status: "open", closedAt: null },
      }),
      prisma.ticketStatusHistory.create({
        data: {
          ticketId,
          changedById: reopenedById,
          fromStatus:  "closed",
          toStatus:    "open",
          note:        "Ticket reopened",
        },
      }),
    ]);

    return { ...ticket, status: "open" };
  },

  // ──────────────────────────────────────────────────────
  // STATS (for admin dashboard)
  // ──────────────────────────────────────────────────────

  async getStats() {
    const [byStatus, byPriority, total] = await Promise.all([
      prisma.ticket.groupBy({ by: ["status"],   _count: { id: true } }),
      prisma.ticket.groupBy({ by: ["priority"], _count: { id: true } }),
      prisma.ticket.count(),
    ]);

    return {
      total,
      byStatus:   byStatus.map((r) => ({ status: r.status, count: r._count.id })),
      byPriority: byPriority.map((r) => ({ priority: r.priority, count: r._count.id })),
    };
  },

  // ──────────────────────────────────────────────────────
  // PRIVATE
  // ──────────────────────────────────────────────────────

  async _nextTicketNumber() {
    const result = await prisma.$queryRaw`
      SELECT LPAD(CAST(nextval('ticket_number_seq') AS TEXT), 6, '0') AS seq
    `;
    return `TKT-${result[0].seq}`;
  },

  _isStaff(roles = []) {
    return (
      roles.includes("admin") ||
      roles.includes("superadmin") ||
      roles.includes("staff") ||
      roles.includes("support")
    );
  },
};

module.exports = TicketService;
