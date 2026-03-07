// src/modules/support/tickets/ticket.controller.js
// Matches project pattern: static class, try/catch, status codes

const TicketService = require("./ticket.service");

class TicketController {
  // ──────────────────────────────────────────────────────
  // POST /support/tickets
  // ──────────────────────────────────────────────────────
  static async create(req, res) {
    try {
      const { departmentId, subject, body, priority, metadata } = req.body;

      if (!departmentId || !subject || !body) {
        return res.status(400).json({ error: "departmentId, subject and body are required" });
      }

      const ticket = await TicketService.createTicket({
        clientId: req.user.id,
        departmentId,
        subject,
        body,
        priority,
        metadata,
      });

      return res.status(201).json({ success: true, ticket });
    } catch (err) {
      console.error("TICKET CREATE ERROR:", err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // GET /support/tickets
  // ──────────────────────────────────────────────────────
  static async list(req, res) {
    try {
      const { status, priority, departmentId, assignedToId, search, page = 1, limit = 20 } = req.query;

      const result = await TicketService.listTickets(
        { status, priority, departmentId, assignedToId, search },
        { page: Number(page), limit: Number(limit) },
        req.user.id,
        req.user.roles
      );

      return res.json(result);
    } catch (err) {
      console.error("TICKET LIST ERROR:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // GET /support/tickets/stats  [staff]
  // ──────────────────────────────────────────────────────
  static async getStats(req, res) {
    try {
      const stats = await TicketService.getStats();
      return res.json({ success: true, ...stats });
    } catch (err) {
      console.error("TICKET STATS ERROR:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // GET /support/tickets/:id
  // ──────────────────────────────────────────────────────
  static async get(req, res) {
    try {
      const ticket = await TicketService.getTicket(
        req.params.id,
        req.user.id,
        req.user.roles
      );
      return res.json({ success: true, ticket });
    } catch (err) {
      console.error("TICKET GET ERROR:", err.message);
      const status =
        err.message === "Ticket not found" ? 404
        : err.message === "Access denied" ? 403
        : 400;
      return res.status(status).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // POST /support/tickets/:id/reply
  // ──────────────────────────────────────────────────────
  static async addReply(req, res) {
    try {
      const { body, type } = req.body;

      if (!body || !body.trim()) {
        return res.status(400).json({ error: "Reply body is required" });
      }

      const reply = await TicketService.addReply({
        ticketId:       req.params.id,
        authorId:       req.user.id,
        body,
        type,
        requesterRoles: req.user.roles,
      });

      return res.status(201).json({ success: true, reply });
    } catch (err) {
      console.error("TICKET REPLY ERROR:", err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // POST /support/tickets/:id/close
  // ──────────────────────────────────────────────────────
  static async close(req, res) {
    try {
      const { resolutionNote } = req.body;
      const ticket = await TicketService.closeTicket(
        req.params.id,
        req.user.id,
        resolutionNote || null
      );
      return res.json({ success: true, ticket });
    } catch (err) {
      console.error("TICKET CLOSE ERROR:", err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // POST /support/tickets/:id/reopen
  // ──────────────────────────────────────────────────────
  static async reopen(req, res) {
    try {
      const ticket = await TicketService.reopenTicket(req.params.id, req.user.id);
      return res.json({ success: true, ticket });
    } catch (err) {
      console.error("TICKET REOPEN ERROR:", err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // PUT /support/tickets/:id/assign  [staff]
  // ──────────────────────────────────────────────────────
  static async assign(req, res) {
    try {
      const { assignedToId } = req.body;
      if (!assignedToId) {
        return res.status(400).json({ error: "assignedToId is required" });
      }
      const ticket = await TicketService.assignTicket(
        req.params.id,
        assignedToId,
        req.user.id
      );
      return res.json({ success: true, ticket });
    } catch (err) {
      console.error("TICKET ASSIGN ERROR:", err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // PUT /support/tickets/:id/status  [staff]
  // ──────────────────────────────────────────────────────
  static async changeStatus(req, res) {
    try {
      const { status, note } = req.body;
      if (!status) {
        return res.status(400).json({ error: "status is required" });
      }
      const ticket = await TicketService.changeStatus(
        req.params.id,
        status,
        req.user.id,
        note || null
      );
      return res.json({ success: true, ticket });
    } catch (err) {
      console.error("TICKET STATUS ERROR:", err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // PUT /support/tickets/:id/priority  [staff]
  // ──────────────────────────────────────────────────────
  static async changePriority(req, res) {
    try {
      const { priority } = req.body;
      if (!priority) {
        return res.status(400).json({ error: "priority is required" });
      }
      const ticket = await TicketService.changePriority(
        req.params.id,
        priority,
        req.user.id
      );
      return res.json({ success: true, ticket });
    } catch (err) {
      console.error("TICKET PRIORITY ERROR:", err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  // ──────────────────────────────────────────────────────
  // PUT /support/tickets/:id/transfer  [staff]
  // ──────────────────────────────────────────────────────
  static async transfer(req, res) {
    try {
      const { departmentId, note } = req.body;
      if (!departmentId) {
        return res.status(400).json({ error: "departmentId is required" });
      }
      const ticket = await TicketService.transferDepartment(
        req.params.id,
        departmentId,
        req.user.id,
        note || null
      );
      return res.json({ success: true, ticket });
    } catch (err) {
      console.error("TICKET TRANSFER ERROR:", err.message);
      return res.status(400).json({ error: err.message });
    }
  }
}

module.exports = TicketController;
