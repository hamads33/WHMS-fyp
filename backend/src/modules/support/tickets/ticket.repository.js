'use strict';

/**
 * tickets/ticket.repository.js
 *
 * Pure data-access layer.  No business logic — only queries.
 * All methods receive a prisma client injected via the constructor.
 */

const TICKET_INCLUDE = {
  client: { select: { id: true, email: true, clientProfile: true } },
  assignedTo: { select: { id: true, email: true, adminProfile: true } },
  department: true,
  replies: {
    include: {
      author: { select: { id: true, email: true } },
      attachments: true,
    },
    orderBy: { createdAt: 'asc' },
  },
  attachments: true,
  statusHistory: {
    include: { changedBy: { select: { id: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  },
};

class TicketRepository {
  /** @param {import('@prisma/client').PrismaClient} prisma */
  constructor(prisma) {
    this.prisma = prisma;
  }

  // ----------------------------------------------------------------
  // TICKET CRUD
  // ----------------------------------------------------------------

  async create(data) {
    const ticketNumber = await this._nextTicketNumber();
    return this.prisma.ticket.create({
      data: { ...data, ticketNumber },
      include: TICKET_INCLUDE,
    });
  }

  async findById(id, includeDetails = false) {
    return this.prisma.ticket.findUnique({
      where: { id },
      include: includeDetails ? TICKET_INCLUDE : undefined,
    });
  }

  async findByTicketNumber(ticketNumber) {
    return this.prisma.ticket.findUnique({
      where: { ticketNumber },
      include: TICKET_INCLUDE,
    });
  }

  /**
   * Paginated list with filtering.
   * @param {object} filters
   * @param {object} pagination  { page, limit }
   */
  async findAll(filters = {}, pagination = { page: 1, limit: 20 }) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where = this._buildWhere(filters);

    const [rows, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { priority: 'desc' }, // urgent first
          { updatedAt: 'desc' },
        ],
        include: {
          client: { select: { id: true, email: true, clientProfile: true } },
          assignedTo: { select: { id: true, email: true } },
          department: true,
          _count: { select: { replies: true } },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { rows, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async update(id, data) {
    return this.prisma.ticket.update({ where: { id }, data });
  }

  // ----------------------------------------------------------------
  // REPLIES
  // ----------------------------------------------------------------

  async createReply(data) {
    return this.prisma.ticketReply.create({
      data,
      include: { author: { select: { id: true, email: true } }, attachments: true },
    });
  }

  async findRepliesByTicket(ticketId) {
    return this.prisma.ticketReply.findMany({
      where: { ticketId },
      include: {
        author: { select: { id: true, email: true } },
        attachments: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ----------------------------------------------------------------
  // STATUS HISTORY
  // ----------------------------------------------------------------

  async recordStatusChange({ ticketId, changedById, fromStatus, toStatus, fromPriority, toPriority, note }) {
    return this.prisma.ticketStatusHistory.create({
      data: { ticketId, changedById, fromStatus, toStatus, fromPriority, toPriority, note },
    });
  }

  // ----------------------------------------------------------------
  // ATTACHMENTS
  // ----------------------------------------------------------------

  async createAttachment(data) {
    return this.prisma.ticketAttachment.create({ data });
  }

  async findAttachment(id) {
    return this.prisma.ticketAttachment.findUnique({ where: { id } });
  }

  async deleteAttachment(id) {
    return this.prisma.ticketAttachment.delete({ where: { id } });
  }

  // ----------------------------------------------------------------
  // SLA HELPERS
  // ----------------------------------------------------------------

  /** Returns tickets past their first-response SLA and not yet responded to */
  async findSlaBreachCandidates() {
    const now = new Date();
    return this.prisma.ticket.findMany({
      where: {
        firstResponseAt: null,
        status: { not: 'closed' },
        slaBreachedAt: null,
        department: { slaResponseTime: { not: null } },
      },
      include: { department: true },
    });
  }

  // ----------------------------------------------------------------
  // STATS
  // ----------------------------------------------------------------

  async getStats(filters = {}) {
    const where = this._buildWhere(filters);
    const [byStatus, byPriority, byDepartment] = await Promise.all([
      this.prisma.ticket.groupBy({ by: ['status'], where, _count: { id: true } }),
      this.prisma.ticket.groupBy({ by: ['priority'], where, _count: { id: true } }),
      this.prisma.ticket.groupBy({ by: ['departmentId'], where, _count: { id: true } }),
    ]);
    return { byStatus, byPriority, byDepartment };
  }

  // ----------------------------------------------------------------
  // PRIVATE HELPERS
  // ----------------------------------------------------------------

  _buildWhere(filters) {
    const where = {};
    if (filters.clientId)     where.clientId     = filters.clientId;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.status)       where.status       = filters.status;
    if (filters.priority)     where.priority     = filters.priority;
    if (filters.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { ticketNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async _nextTicketNumber() {
    // Atomic counter — uses a raw SQL sequence for safety under concurrency
    const result = await this.prisma.$queryRaw`
      SELECT LPAD(CAST(nextval('ticket_number_seq') AS TEXT), 6, '0') AS seq
    `;
    return `TKT-${result[0].seq}`;
  }
}

module.exports = { TicketRepository };
