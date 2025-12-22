// src/lib/impersonation.js
import { apiFetch } from "@/lib/api/client";


/**
 * Impersonation API (cookie-based auth)
 */
export const ImpersonationAPI = {
  start(body) {
    return api
      .post("/api/auth/impersonate/start", body)
      .then((res) => res.data);
  },

  stop(body = {}) {
    return api
      .post("/api/auth/impersonate/stop", body)
      .then((res) => res.data);
  },

  list() {
    return api
      .get("/api/auth/impersonate/list")
      .then((res) => res.data);
  },

  status() {
    return api
      .get("/api/auth/impersonation-status")
      .then((res) => res.data);
  },
};
