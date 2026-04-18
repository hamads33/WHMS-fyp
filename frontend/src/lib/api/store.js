/**
 * Store API — calls the public /api/store/* endpoints (no auth required).
 * Used by the WHMS-native hosted storefront.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function storeFetch(path, opts = {}) {
  const res = await fetch(`${BASE}/store${path}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `Store API error ${res.status}`);
  }
  return res.json();
}

// Auth endpoints (uses existing /api/auth — cookie-based)
async function authFetch(path, opts = {}) {
  const res = await fetch(`${BASE}/auth${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Auth error ${res.status}`);
  return data;
}

// Orders / invoices endpoints (uses existing client routes — cookie-based)
async function clientFetch(path, opts = {}) {
  const res = await fetch(`${BASE}/client${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `API error ${res.status}`);
  return data;
}

export const StoreAPI = {
  // ── Catalog (public) ──────────────────────────────────────────────────────
  listServices: ()      => storeFetch("/services"),
  getService:   (id)    => storeFetch(`/services/${id}`),
  listPlans:    (q = {}) => {
    const qs = new URLSearchParams(q).toString();
    return storeFetch(`/plans${qs ? `?${qs}` : ""}`);
  },

  // ── Auth (cookie-based) ──────────────────────────────────────────────────
  register: (email, password, firstName, lastName) =>
    authFetch("/register", {
      method: "POST",
      body: JSON.stringify({ email, password, firstName, lastName }),
    }),

  login: (email, password) =>
    authFetch("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => authFetch("/me"),

  // ── Orders + Invoices (cookie-based) ─────────────────────────────────────
  placeOrder: (data) =>
    clientFetch("/orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getInvoice: (id) => clientFetch(`/billing/invoices/${id}`),

  payInvoice: (id, gateway = "manual") =>
    clientFetch(`/billing/invoices/${id}/pay`, {
      method: "POST",
      body: JSON.stringify({ gateway }),
    }),
};
