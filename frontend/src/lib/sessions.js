import { apiFetch } from "@/lib/api/client";

export const SessionsAPI = {
  // Bootstrap auth + portal
  getCurrent() {
    return apiFetch("/api/auth/session/current");
  },

  // Devices
  list() {
    return apiFetch("/api/auth/sessions");
  },

  revoke(sessionId) {
    return apiFetch(`/api/auth/sessions/${sessionId}`, {
      method: "DELETE",
    });
  },

  revokeOthers() {
    return apiFetch("/api/auth/sessions/others/all", {
      method: "DELETE",
    });
  },

  securityLogs() {
    return apiFetch("/api/auth/sessions/security/logs");
  },
};
