// src/lib/impersonation.ts
import { api } from "./api";
import type { ApiRequestBody, ApiResponse } from "./api";

export const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const ImpersonationAPI = {
  /** Start impersonation (admin only) */
  start(body: ApiRequestBody<"/api/auth/impersonate/start", "post">) {
    return api
      .post("/api/auth/impersonate/start", body)
      .then(
        (res) =>
          res.data as ApiResponse<
            "/api/auth/impersonate/start",
            "post"
          >[200]
      );
  },

  /** Stop impersonation session — accept optional body (sessionId) */
  stop(body?: ApiRequestBody<"/api/auth/impersonate/stop", "post">) {
    const payload = typeof body !== "undefined" ? body : {};
    return api
      .post("/api/auth/impersonate/stop", payload)
      .then(
        (res) =>
          res.data as ApiResponse<
            "/api/auth/impersonate/stop",
            "post"
          >[200]
      );
  },

  /** List all impersonation sessions for current admin */
  list() {
    return api
      .get("/api/auth/impersonate/list")
      .then(
        (res) =>
          res.data as ApiResponse<
            "/api/auth/impersonate/list",
            "get"
          >[200]
      );
  },

  /** Check if current user is impersonating someone */
  status() {
    return api
      .get("/api/auth/impersonation-status")
      .then(
        (res) =>
          res.data as ApiResponse<
            "/api/auth/impersonation-status",
            "get"
          >[200]
      );
  },
} as const;
