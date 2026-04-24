const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request(url, options = {}) {
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

  return res.json();
}

export const AdminUsersAPI = {
  async list(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/api/admin/users${query ? `?${query}` : ""}`);
  },

  async get(id) {
    return request(`/api/admin/users/${id}`);
  },

  async updateRoles(id, body) {
    return request(`/api/admin/users/${id}/roles`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async deactivate(id, body) {
    return request(`/api/admin/users/${id}/deactivate`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async forceLogout(id) {
    return request(`/api/admin/users/${id}/logout`, {
      method: "POST",
    });
  },

  async impersonate(id, body) {
    return request(`/api/admin/users/${id}/impersonate`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
