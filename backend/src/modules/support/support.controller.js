'use strict';

/**
 * support.controller.js
 *
 * Thin HTTP layer. Controllers only:
 *  1. Extract and validate input from req
 *  2. Call the appropriate service
 *  3. Send a response
 *
 * No business logic lives here.
 */

class SupportController {
  /**
   * @param {import('./tickets/ticket.service').TicketService} ticketService
   * @param {import('./chat/chat.service').ChatService} chatService
   * @param {import('./departments/department.service').DepartmentService} deptService
   */
  constructor(ticketService, chatService, deptService) {
    this.ticketService = ticketService;
    this.chatService   = chatService;
    this.deptService   = deptService;

    // Bind methods so they work as Express handlers
    this._bind();
  }

  // ================================================================
  // TICKETS
  // ================================================================

  async createTicket(req, res) {
    const { departmentId, subject, body, priority, metadata } = req.body;
    const files = req.files || [];

    const ticket = await this.ticketService.createTicket({
      clientId:     req.user.id,
      departmentId,
      subject,
      body,
      priority,
      metadata,
      files,
    });

    res.status(201).json({ success: true, data: ticket });
  }

  async listTickets(req, res) {
    const { status, priority, departmentId, assignedToId, search, page = 1, limit = 20 } = req.query;

    const result = await this.ticketService.listTickets(
      { status, priority, departmentId, assignedToId, search },
      { page: Number(page), limit: Number(limit) },
      req.user.id,
      req.user.roles,
    );

    res.json({ success: true, data: result });
  }

  async getTicket(req, res) {
    const ticket = await this.ticketService.getTicket(
      req.params.id,
      req.user.id,
      req.user.roles,
    );
    res.json({ success: true, data: ticket });
  }

  async addReply(req, res) {
    const { body, type } = req.body;
    const files = req.files || [];

    const reply = await this.ticketService.addReply({
      ticketId:       req.params.id,
      authorId:       req.user.id,
      body,
      type,
      files,
      requesterRoles: req.user.roles,
    });

    res.status(201).json({ success: true, data: reply });
  }

  async closeTicket(req, res) {
    const { resolutionNote } = req.body;
    const ticket = await this.ticketService.closeTicket(
      req.params.id,
      req.user.id,
      resolutionNote,
    );
    res.json({ success: true, data: ticket });
  }

  async reopenTicket(req, res) {
    const ticket = await this.ticketService.reopenTicket(req.params.id, req.user.id);
    res.json({ success: true, data: ticket });
  }

  // Staff-only actions
  async assignTicket(req, res) {
    const { assignedToId } = req.body;
    const ticket = await this.ticketService.assignTicket(
      req.params.id, assignedToId, req.user.id,
    );
    res.json({ success: true, data: ticket });
  }

  async changeStatus(req, res) {
    const { status, note } = req.body;
    const ticket = await this.ticketService.changeStatus(req.params.id, status, req.user.id, note);
    res.json({ success: true, data: ticket });
  }

  async changePriority(req, res) {
    const { priority } = req.body;
    const ticket = await this.ticketService.changePriority(req.params.id, priority, req.user.id);
    res.json({ success: true, data: ticket });
  }

  async transferDepartment(req, res) {
    const { departmentId, note } = req.body;
    const ticket = await this.ticketService.transferDepartment(
      req.params.id, departmentId, req.user.id, note,
    );
    res.json({ success: true, data: ticket });
  }

  async getTicketStats(req, res) {
    const stats = await this.ticketService.getStats(
      req.query,
      req.user.id,
      req.user.roles,
    );
    res.json({ success: true, data: stats });
  }

  // ================================================================
  // DEPARTMENTS
  // ================================================================

  async listDepartments(req, res) {
    const depts = await this.deptService.list();
    res.json({ success: true, data: depts });
  }

  async createDepartment(req, res) {
    const dept = await this.deptService.create(req.body);
    res.status(201).json({ success: true, data: dept });
  }

  async updateDepartment(req, res) {
    const dept = await this.deptService.update(req.params.id, req.body);
    res.json({ success: true, data: dept });
  }

  // ================================================================
  // CHAT
  // ================================================================

  async startChat(req, res) {
    const { departmentId, subject } = req.body;
    const session = await this.chatService.startChat({
      clientId: req.user.id,
      departmentId,
      subject,
    });
    res.status(201).json({ success: true, data: session });
  }

  async sendChatMessage(req, res) {
    const { body, metadata } = req.body;
    const message = await this.chatService.sendMessage({
      sessionId: req.params.sessionId,
      senderId:  req.user.id,
      body,
      metadata,
    });
    res.status(201).json({ success: true, data: message });
  }

  async endChat(req, res) {
    const session = await this.chatService.endChat(req.params.sessionId, req.user.id);
    res.json({ success: true, data: session });
  }

  async getChat(req, res) {
    const session = await this.chatService.getSession(
      req.params.sessionId,
      req.user.id,
      req.user.roles,
    );
    res.json({ success: true, data: session });
  }

  async getChatTranscript(req, res) {
    const messages = await this.chatService.getTranscript(req.params.sessionId);
    res.json({ success: true, data: messages });
  }

  async convertChatToTicket(req, res) {
    const ticket = await this.chatService.convertToTicket(
      req.params.sessionId,
      req.user.id,
      req.body,
    );
    res.status(201).json({ success: true, data: ticket });
  }

  async rateChat(req, res) {
    const { rating, feedback } = req.body;
    const session = await this.chatService.rateSession(
      req.params.sessionId,
      req.user.id,
      rating,
      feedback,
    );
    res.json({ success: true, data: session });
  }

  async agentJoinChat(req, res) {
    const session = await this.chatService.agentJoin(req.params.sessionId, req.user.id);
    res.json({ success: true, data: session });
  }

  async agentLeaveChat(req, res) {
    const session = await this.chatService.agentLeave(req.params.sessionId, req.user.id);
    res.json({ success: true, data: session });
  }

  async getWaitingQueue(req, res) {
    const { departmentId } = req.query;
    const sessions = await this.chatService.getWaitingQueue(departmentId);
    res.json({ success: true, data: sessions });
  }

  async setAgentAvailability(req, res) {
    const { acceptingChats, maxConcurrentChats } = req.body;
    const agent = await this.chatService.updateAgentAvailability(req.user.id, {
      acceptingChats,
      maxConcurrentChats,
    });
    res.json({ success: true, data: agent });
  }

  // ================================================================
  // PRIVATE
  // ================================================================

  _bind() {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter(m => m !== 'constructor' && !m.startsWith('_'));
    for (const m of methods) {
      this[m] = this[m].bind(this);
    }
  }
}

module.exports = { SupportController };
