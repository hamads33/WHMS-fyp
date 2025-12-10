// src/lib/api.ts
import axios from "axios";
import type { paths } from "../types/openapi";

// OpenAPI helper types (unchanged)
export type ApiResponse<P extends keyof paths, M extends keyof paths[P]> =
  paths[P][M] extends { responses: infer R }
    ? {
        [S in keyof R]: R[S] extends {
          content: { "application/json": infer C };
        }
          ? C
          : never;
      }
    : never;

export type ApiRequestBody<P extends keyof paths, M extends keyof paths[P]> =
  paths[P][M] extends {
    requestBody: { content: { "application/json": infer B } };
  }
    ? B
    : never;

// Axios instance
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  withCredentials: true, // <--- send cookies
});

// We do NOT attach Authorization header from localStorage because server uses httpOnly cookies.

// Auto-refresh on 401 (cookie-based)
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error?.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        // call refresh endpoint (cookie-based)
        await axios.post(`${api.defaults.baseURL}/api/auth/refresh`, {}, { withCredentials: true });

        // retry original request
        return api(original);
      } catch (e) {
        // refresh failed — propagate original error
        return Promise.reject(e);
      }
    }

    return Promise.reject(error);
  }
);
// (append to src/lib/api.ts)
export function setAuthHeader(token: string | null) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

export function saveImpersonationTokenToSession(token: string | null) {
  if (token) {
    try {
      sessionStorage.setItem("impersonation_access_token", token);
    } catch {}
  } else {
    try {
      sessionStorage.removeItem("impersonation_access_token");
    } catch {}
  }
}

// On module init: if sessionStorage has a token, set header
try {
  const existing = sessionStorage.getItem("impersonation_access_token");
  if (existing) setAuthHeader(existing);
} catch {}

export default api;
