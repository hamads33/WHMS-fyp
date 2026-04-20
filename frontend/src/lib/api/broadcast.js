import { apiFetch } from './client'

export const AdminBroadcastAPI = {
  list: (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return apiFetch(`/admin/broadcasts${queryString ? '?' + queryString : ''}`)
  },

  get: (id) => apiFetch(`/admin/broadcasts/${id}`),

  create: (formData) =>
    apiFetch('/admin/broadcasts', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set multipart boundary
    }),

  update: (id, data) =>
    apiFetch(`/admin/broadcasts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    apiFetch(`/admin/broadcasts/${id}`, {
      method: 'DELETE',
    }),

  getEngagement: (id) => apiFetch(`/admin/broadcasts/${id}/engagement`),

  getServerTime: () => apiFetch('/admin/broadcasts/time'),
}

export const ClientBroadcastAPI = {
  getNotifications: () => apiFetch('/client/broadcasts/notifications'),

  getDocuments: () => apiFetch('/client/broadcasts/documents'),

  dismiss: (id) =>
    apiFetch(`/client/broadcasts/${id}/dismiss`, {
      method: 'POST',
    }),

  getDownloadUrl: (id) =>
    `${process.env.NEXT_PUBLIC_API_URL}/client/broadcasts/${id}/download`,
}
