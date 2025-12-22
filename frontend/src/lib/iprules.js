import { apiFetch } from "@/lib/api/client";

export const IpRulesAPI = {
  async listRules() {
    const res = await apiFetch("/api/ip-rules");
    return res.rules || [];
  },

  async createRule(body) {
    return apiFetch("/api/ip-rules", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async updateRule(id, body) {
    return apiFetch(`/api/ip-rules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  async deleteRule(id) {
    return apiFetch(`/api/ip-rules/${id}`, {
      method: "DELETE",
    });
  },
};
