// src/lib/auth.js
import { apiFetch } from "@/lib/api/client";

/**
 * Auth API
 * Cookie-first, fetch-based, SSR-safe
 */
export const AuthAPI = {
  register(body) {
    return apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  login(body) {
    return apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  logout() {
    return apiFetch("/api/auth/logout", {
      method: "POST",
    });
  },

  refresh() {
    return apiFetch("/api/auth/refresh", {
      method: "POST",
    });
  },

  me() {
    return apiFetch("/api/auth/me");
  },

  // -------------------------
  // IMPERSONATION
  // -------------------------
  impersonateStart(body) {
    return apiFetch("/api/auth/impersonate/start", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  impersonateStop(body = {}) {
    return apiFetch("/api/auth/impersonate/stop", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  impersonationList() {
    return apiFetch("/api/auth/impersonate/list");
  },
};
