import { apiFetch } from './client';

const BASE = '/admin/email';

export const EmailSettingsAPI = {
  getAll:          ()       => apiFetch(`${BASE}/settings`),
  update:          (data)   => apiFetch(`${BASE}/settings`,              { method: 'PUT',  body: JSON.stringify(data) }),
  testConnection:  ()       => apiFetch(`${BASE}/settings/test-connection`, { method: 'POST' }),
  sendTestEmail:   (to)     => apiFetch(`${BASE}/settings/test-send`,    { method: 'POST', body: JSON.stringify({ to }) }),

  // Send raw HTML directly — used by email builder "Send Test" button
  sendDirect: ({ to, subject, html }) =>
    apiFetch(`${BASE}/send-direct`, { method: 'POST', body: JSON.stringify({ to, subject, html }) }),
};
