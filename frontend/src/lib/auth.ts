// src/lib/auth.ts
import { api } from "./api";
import type { ApiRequestBody, ApiResponse } from "./api";

/**
 * Backend responses (concrete shapes)
 * These reflect your server: login returns { message, user }, me returns { user }, etc.
 */
export type AuthUser = {
  id: string;
  email: string;
  roles?: string[];
  portals?: string[];
  emailVerified?: boolean;
  mfaVerified?: boolean;
};

type LoginResponse = { message: string; user: AuthUser };
type MeResponse = { user: AuthUser };
type GenericOk = { success?: boolean; message?: string };

/**
 * Auth API
 * Uses axios instance (cookie-first).
 */
export const AuthAPI = {
  async register(body: ApiRequestBody<"/api/auth/register", "post">) {
    const res = await api.post("/api/auth/register", body);
    return res.data as ApiResponse<"/api/auth/register", "post">[201];
  },

  async login(body: { email: string; password: string }) {
    const res = await api.post("/api/auth/login", body);
    return res.data as LoginResponse;
  },

  // NOTE: refresh accepts a request body according to OpenAPI (RefreshInput).
  // Make the parameter optional so callers can do `await AuthAPI.refresh()` or pass a body.
  async refresh(
    body?: ApiRequestBody<"/api/auth/refresh", "post">
  ): Promise<ApiResponse<"/api/auth/refresh", "post">[200]> {
    // if caller didn't provide body, send an empty object (server may use cookies)
    const payload = typeof body !== "undefined" ? body : {};
    const res = await api.post("/api/auth/refresh", payload);
    return res.data;
  },

  // logout's requestBody is optional in your OpenAPI (LogoutInput). Accept optional body.
  async logout(body?: ApiRequestBody<"/api/auth/logout", "post">): Promise<GenericOk> {
    const payload = typeof body !== "undefined" ? body : {};
    const res = await api.post("/api/auth/logout", payload);
    return res.data;
  },

  async sendVerifyEmail(body: ApiRequestBody<"/api/auth/email/send", "post">) {
    const res = await api.post("/api/auth/email/send", body);
    return res.data;
  },

  async verifyEmail(token: string) {
    const res = await api.get("/api/auth/email/verify", { params: { token } });
    return res.data;
  },

async impersonateStart(
  body: { targetUserId: string; reason?: string }
) {
  const res = await api.post("/api/auth/impersonate/start", body);
  return res.data;
},


  // Accept optional body typed from OpenAPI; caller can pass { sessionId }.
async impersonateStop(
  body: { sessionId?: string }
) {
  const res = await api.post("/api/auth/impersonate/stop", body);
  return res.data;
},


  async impersonationList() {
    const res = await api.get("/api/auth/impersonate/list");
    return res.data;
  },

  async me(): Promise<MeResponse> {
    const res = await api.get("/api/auth/me");
    return res.data as MeResponse;
  },
} as const;
