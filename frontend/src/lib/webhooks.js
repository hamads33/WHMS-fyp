import { apiFetch } from "@/lib/api/client";

const BASE = "/admin/server-management/webhooks";

export const WebhooksAPI = {
  list() {
    return apiFetch(BASE);
  },

  create(data) {
    return apiFetch(BASE, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update(id, data) {
    return apiFetch(`${BASE}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  remove(id) {
    return apiFetch(`${BASE}/${id}`, {
      method: "DELETE",
    });
  },

  getSettings() {
    return apiFetch(`${BASE}/settings`);
  },

  updateSettings(enabledEvents) {
    return apiFetch(`${BASE}/settings`, {
      method: "PUT",
      body: JSON.stringify({ enabledEvents }),
    });
  },
};
