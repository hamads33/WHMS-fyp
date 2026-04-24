import { apiFetch } from './client'

/* ======================================================
   DOMAIN OPERATIONS (USER)
====================================================== */

/**
 * Get all domains for current user
 */
export function getDomains(filters = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.append('status', filters.status)
  if (filters.search) params.append('search', filters.search)
  if (filters.page) params.append('page', filters.page)
  if (filters.limit) params.append('limit', filters.limit)
  
  const query = params.toString()
  return apiFetch(`/domains${query ? `?${query}` : ''}`)
}

/**
 * Get single domain by ID
 */
export function getDomainById(id) {
  return apiFetch(`/domains/${id}`)
}

/**
 * Check domain availability
 */
export function checkDomainAvailability(domain, registrar = 'mock') {
  return apiFetch('/domains/check', {
    method: 'POST',
    body: JSON.stringify({ domain, registrar }),
  })
}

/**
 * Register a new domain
 */
export function registerDomain(payload) {
  return apiFetch('/domains/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Get WHOIS data for domain
 */
export function getWhoisData(domain) {
  return apiFetch(`/domains/whois?domain=${encodeURIComponent(domain)}`)
}

/**
 * Update nameservers
 */
export function updateNameservers(domainId, nameservers) {
  return apiFetch(`/domains/${domainId}/nameservers`, {
    method: 'PUT',
    body: JSON.stringify({ nameservers }),
  })
}

/**
 * Renew a domain
 */
export function renewDomain(domainId, years = 1) {
  return apiFetch(`/domains/${domainId}/renew`, {
    method: 'POST',
    body: JSON.stringify({ years }),
  })
}

/**
 * Transfer domain to another registrar
 */
export function transferDomain(payload) {
  return apiFetch('/domains/transfer', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/* ======================================================
   DNS OPERATIONS
====================================================== */

/**
 * Get all DNS records for a domain
 */
export function getDnsRecords(domainId) {
  return apiFetch(`/domains/${domainId}/dns`)
}

/**
 * Add DNS record
 */
export function addDnsRecord(domainId, record) {
  return apiFetch(`/domains/${domainId}/dns`, {
    method: 'POST',
    body: JSON.stringify(record),
  })
}

/**
 * Update DNS record
 */
export function updateDnsRecord(domainId, recordId, updates) {
  return apiFetch(`/domains/${domainId}/dns/${recordId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
}

/**
 * Delete DNS record
 */
export function deleteDnsRecord(domainId, recordId) {
  return apiFetch(`/domains/${domainId}/dns/${recordId}`, {
    method: 'DELETE',
  })
}

/* ======================================================
   ADMIN OPERATIONS
====================================================== */

/**
 * Admin: Get all domains (paginated)
 */
export function adminGetDomains(filters = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.append('status', filters.status)
  if (filters.registrar) params.append('registrar', filters.registrar)
  if (filters.search) params.append('search', filters.search)
  if (filters.page) params.append('page', filters.page)
  if (filters.limit) params.append('limit', filters.limit)
  
  const query = params.toString()
  return apiFetch(`/admin/domains${query ? `?${query}` : ''}`)
}

/**
 * Admin: Get single domain with full details
 */
export function adminGetDomainById(id) {
  return apiFetch(`/admin/domains/${id}`)
}

export function adminGetDomainCapabilities(domainId) {
  return apiFetch(`/admin/domains/${domainId}/capabilities`)
}

export function adminGetDomainDns(domainId) {
  return apiFetch(`/admin/domains/${domainId}/dns`)
}

export function adminCreateDomainDns(domainId, record) {
  return apiFetch(`/admin/domains/${domainId}/dns`, {
    method: 'POST',
    body: JSON.stringify(record),
  })
}

export function adminUpdateDomainDns(domainId, recordId, record) {
  return apiFetch(`/admin/domains/${domainId}/dns/${recordId}`, {
    method: 'PUT',
    body: JSON.stringify(record),
  })
}

export function adminDeleteDomainDns(domainId, recordId) {
  return apiFetch(`/admin/domains/${domainId}/dns/${recordId}`, {
    method: 'DELETE',
  })
}

export function adminGetDomainGlue(domainId) {
  return apiFetch(`/admin/domains/${domainId}/glue`)
}

export function adminCreateDomainGlue(domainId, payload) {
  return apiFetch(`/admin/domains/${domainId}/glue`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function adminUpdateDomainGlue(domainId, subdomain, payload) {
  return apiFetch(`/admin/domains/${domainId}/glue/${encodeURIComponent(subdomain)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function adminDeleteDomainGlue(domainId, subdomain) {
  return apiFetch(`/admin/domains/${domainId}/glue/${encodeURIComponent(subdomain)}`, {
    method: 'DELETE',
  })
}

export function adminGetDomainForwarding(domainId) {
  return apiFetch(`/admin/domains/${domainId}/forwarding`)
}

export function adminCreateDomainForwarding(domainId, payload) {
  return apiFetch(`/admin/domains/${domainId}/forwarding`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function adminDeleteDomainForwarding(domainId, forwardId) {
  return apiFetch(`/admin/domains/${domainId}/forwarding/${forwardId}`, {
    method: 'DELETE',
  })
}

export function adminGetDomainSSL(domainId) {
  return apiFetch(`/admin/domains/${domainId}/ssl`)
}

export function adminCheckDomainPrice(payload) {
  return apiFetch('/admin/domains/check-domain-pricing', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function adminCheckRenewalPrice(domainId) {
  return apiFetch(`/admin/domains/${domainId}/price-check`, {
    method: 'POST',
  })
}

/**
 * Admin: Renew domain (with admin override)
 */
export function adminRenewDomain(domainId, payload) {
  return apiFetch(`/admin/domains/${domainId}/renew`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Admin: Override domain fields
 */
export function adminOverrideDomain(domainId, changes) {
  return apiFetch(`/admin/domains/${domainId}/override`, {
    method: 'PATCH',
    body: JSON.stringify({ changes }),
  })
}

/**
 * Admin: Soft delete domain
 */
export function adminDeleteDomain(id) {
  return apiFetch(`/admin/domains/${id}`, {
    method: 'DELETE',
  })
}

/**
 * Admin: Sync domain with registrar
 */
export function adminSyncDomain(domainId) {
  return apiFetch(`/admin/domains/${domainId}/sync`, {
    method: 'POST',
  })
}

/* ======================================================
   DOMAIN STATISTICS & ANALYTICS
====================================================== */

/**
 * Get domain statistics
 */
export function getDomainStats() {
  return apiFetch('/admin/domains/stats')
}

/**
 * Get domains expiring soon
 */
export function getExpiringDomains(days = 30) {
  return apiFetch(`/admin/domains/expiring?days=${days}`)
}

/**
 * Get domain audit logs
 */
export function getDomainLogs(domainId, limit = 50) {
  return apiFetch(`/admin/domains/${domainId}/logs?limit=${limit}`)
}

/* ======================================================
   UTILITY HELPERS
====================================================== */

/**
 * Format date to readable string
 */
export function formatDate(date) {
  if (!date) return 'N/A'
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatMoneyFromCents(cents, currency = 'USD') {
  if (cents === null || cents === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(Number(cents) / 100)
}

/**
 * Get status badge color
 */
export function getStatusColor(status) {
  const colors = {
    active: 'bg-green-500/10 text-green-700 dark:text-green-400',
    expiring_soon: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    expired: 'bg-red-500/10 text-red-700 dark:text-red-400',
    transfer_pending: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  }
  return colors[status] || 'bg-gray-500/10 text-gray-700'
}

/**
 * Get status label
 */
export function getStatusLabel(status) {
  const labels = {
    active: 'Active',
    expiring_soon: 'Expiring Soon',
    expired: 'Expired',
    transfer_pending: 'Transfer Pending',
  }
  return labels[status] || status
}

/**
 * Calculate days until expiry
 */
export function daysUntilExpiry(expiryDate) {
  if (!expiryDate) return null
  const expiry = new Date(expiryDate)
  const today = new Date()
  const diffTime = expiry - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Get expiry status
 */
export function getExpiryStatus(expiryDate) {
  const days = daysUntilExpiry(expiryDate)
  if (days === null) return 'unknown'
  if (days < 0) return 'expired'
  if (days <= 30) return 'expiring_soon'
  return 'active'
}
