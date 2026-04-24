import { apiFetch } from './client'

export const ClientProfileAPI = {
  /**
   * Get current client's profile
   * GET /api/client/profile
   */
  get: () => apiFetch('/client/profile'),

  /**
   * Update current client's profile
   * PUT /api/client/profile
   */
  update: (data) =>
    apiFetch('/client/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /**
   * Change password
   * POST /api/client/profile/change-password
   */
  changePassword: (data) =>
    apiFetch('/client/profile/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}
