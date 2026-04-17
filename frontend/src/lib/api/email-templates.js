import { apiFetch } from './client';

const BASE = '/admin/email';

export const EmailTemplatesAPI = {
  // ── List / Search ────────────────────────────────────────────────
  async list(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`${BASE}/templates${qs ? `?${qs}` : ''}`);
  },

  // ── Single template ──────────────────────────────────────────────
  async get(id) {
    return apiFetch(`${BASE}/templates/${id}`);
  },

  // ── Create ───────────────────────────────────────────────────────
  async create(data) {
    return apiFetch(`${BASE}/templates`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // ── Update ───────────────────────────────────────────────────────
  async update(id, data) {
    return apiFetch(`${BASE}/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // ── Delete ───────────────────────────────────────────────────────
  async remove(id) {
    return apiFetch(`${BASE}/templates/${id}`, { method: 'DELETE' });
  },

  // ── Duplicate ────────────────────────────────────────────────────
  async duplicate(id, newName) {
    return apiFetch(`${BASE}/templates/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ newName }),
    });
  },

  // ── Preview (renders variables with sample data) ─────────────────
  async preview(id, variables = {}) {
    return apiFetch(`${BASE}/templates/${id}/preview`, {
      method: 'POST',
      body: JSON.stringify({ variables }),
    });
  },

  // ── Categories ───────────────────────────────────────────────────
  async categories() {
    return apiFetch(`${BASE}/templates/categories`);
  },

  // ── Save builder layout (create or update) ───────────────────────
  // Stores blocks JSON in variables.__layout and generated HTML in bodyHtml
  async saveLayout({ id, name, displayName, subject, category, language, blocks, html }) {
    const payload = {
      displayName,
      subject,
      category: category || 'general',
      language: language || 'en',
      bodyHtml: html,
      variables: { __layout: blocks },
    };

    if (id) {
      return apiFetch(`${BASE}/templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    }

    return apiFetch(`${BASE}/templates`, {
      method: 'POST',
      body: JSON.stringify({ name, ...payload }),
    });
  },
};
