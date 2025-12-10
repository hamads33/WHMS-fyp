// src/lib/adminUsers.ts
import type { components } from "./openapi-types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

/* ============================================================
   OPENAPI TYPES
============================================================ */
type AdminUserList = components["schemas"]["AdminUserListResponse"];
type AdminUserFull = components["schemas"]["AdminUserFullResponse"];
type UpdateRolesInput = components["schemas"]["AdminUserUpdateRolesInput"];
type UpdateRolesResponse =
  components["schemas"]["AdminUserUpdateRolesResponse"];
type DeactivateInput = components["schemas"]["AdminUserDeactivateInput"];
type DeactivateResponse =
  components["schemas"]["AdminUserDeactivateResponse"];
type ForceLogoutResponse =
  components["schemas"]["AdminUserForceLogoutResponse"];
type ImpersonateInput =
  components["schemas"]["AdminUserImpersonateInput"];
type ImpersonateResponse =
  components["schemas"]["AdminUserImpersonateResponse"];

/* ============================================================
   ADMIN USERS API CLIENT (FETCH VERSION)
============================================================ */

export const AdminUsersAPI = {
  /** GET /api/admin/users */
  async list(params?: {
    q?: string;
    page?: string;
    limit?: string;
    role?: string;
    status?: "active" | "inactive";
  }) {
    const query = new URLSearchParams(params as any).toString();
    const url = `/api/admin/users${query ? `?${query}` : ""}`;

    return request<AdminUserList>(url);
  },

  /** GET /api/admin/users/{id} */
  async get(id: string) {
    return request<AdminUserFull>(`/api/admin/users/${id}`);
  },

  /** POST /api/admin/users/{id}/roles */
  async updateRoles(id: string, body: UpdateRolesInput) {
    return request<UpdateRolesResponse>(`/api/admin/users/${id}/roles`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** POST /api/admin/users/{id}/deactivate */
  async deactivate(id: string, body: DeactivateInput) {
    return request<DeactivateResponse>(`/api/admin/users/${id}/deactivate`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /** POST /api/admin/users/{id}/logout */
  async forceLogout(id: string) {
    return request<ForceLogoutResponse>(`/api/admin/users/${id}/logout`, {
      method: "POST",
    });
  },

  /** POST /api/admin/users/{id}/impersonate */
  async impersonate(id: string, body: ImpersonateInput) {
    return request<ImpersonateResponse>(`/api/admin/users/${id}/impersonate`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
