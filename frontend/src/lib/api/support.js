import { apiFetch } from "./client";

// ─────────────────────────────────────────────────────────────
// CLIENT — Support Tickets
// ─────────────────────────────────────────────────────────────

export const ClientSupportAPI = {

  async listTickets(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/support/tickets${q ? `?${q}` : ""}`);
  },

  async getTicket(id) {
    return apiFetch(`/support/tickets/${id}`);
  },

  async createTicket(data) {
    return apiFetch("/support/tickets", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async addReply(id, body, isInternal = false) {
    return apiFetch(`/support/tickets/${id}/reply`, {
      method: "POST",
      body: JSON.stringify({ body, type: isInternal ? "internal" : "public" }),
    });
  },

  async closeTicket(id, note) {
    return apiFetch(`/support/tickets/${id}/close`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  },

  async reopenTicket(id) {
    return apiFetch(`/support/tickets/${id}/reopen`, { method: "POST" });
  },

  async listDepartments() {
    return apiFetch("/support/departments");
  },
};

// ─────────────────────────────────────────────────────────────
// ADMIN — Support Ticket Management
// ─────────────────────────────────────────────────────────────

export const AdminSupportAPI = {

  async listTickets(params = {}) {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/support/tickets${q ? `?${q}` : ""}`);
  },

  async getStats() {
    return apiFetch("/support/tickets/stats");
  },

  async getTicket(id) {
    return apiFetch(`/support/tickets/${id}`);
  },

  async addReply(id, body, isInternal = false) {
    return apiFetch(`/support/tickets/${id}/reply`, {
      method: "POST",
      body: JSON.stringify({ body, type: isInternal ? "internal" : "public" }),
    });
  },

  async assignTicket(id, assigneeId) {
    return apiFetch(`/support/tickets/${id}/assign`, {
      method: "PUT",
      body: JSON.stringify({ assigneeId }),
    });
  },

  async changeStatus(id, status, note) {
    return apiFetch(`/support/tickets/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, note }),
    });
  },

  async changePriority(id, priority) {
    return apiFetch(`/support/tickets/${id}/priority`, {
      method: "PUT",
      body: JSON.stringify({ priority }),
    });
  },

  async transferTicket(id, departmentId, note) {
    return apiFetch(`/support/tickets/${id}/transfer`, {
      method: "PUT",
      body: JSON.stringify({ departmentId, note }),
    });
  },

  async closeTicket(id, note) {
    return apiFetch(`/support/tickets/${id}/close`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  },

  async reopenTicket(id) {
    return apiFetch(`/support/tickets/${id}/reopen`, { method: "POST" });
  },

  async getChatQueue(departmentId) {
    const q = departmentId ? `?departmentId=${departmentId}` : "";
    return apiFetch(`/support/chat/queue${q}`);
  },
};
