import { apiFetch } from "@/lib/api/client";

export const WebhooksAPI = {
  list() {
    return apiFetch("/api/webhooks");
  },

  create(data) {
    return apiFetch("/api/webhooks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  toggle(id, active) {
    return apiFetch(`/api/webhooks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ active }),
    });
  },

  remove(id) {
    return apiFetch(`/api/webhooks/${id}`, {
      method: "DELETE",
    });
  },

  test(id) {
    return apiFetch(`/api/webhooks/${id}/test`, {
      method: "POST",
    });
  },
};
