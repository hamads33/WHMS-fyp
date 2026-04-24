import { apiFetch } from './client'

const BASE = '/admin/domains/registrars/porkbun'

// Account
export function getPorkbunBalance() {
  return apiFetch(`${BASE}/balance`)
}

export function getPorkbunPricing(tlds = []) {
  const query = tlds.length > 0 ? `?tlds=${tlds.join(',')}` : ''
  return apiFetch(`${BASE}/pricing${query}`)
}

export function checkDomainAvailability(domain) {
  return apiFetch(`${BASE}/check-domain`, {
    method: 'POST',
    body: JSON.stringify({ domain })
  })
}

// Nameservers
export function getNameservers(domain) {
  return apiFetch(`${BASE}/nameservers/${domain}`)
}

export function updateNameservers(domain, nameservers) {
  return apiFetch(`${BASE}/nameservers/${domain}`, {
    method: 'POST',
    body: JSON.stringify({ nameservers })
  })
}

export function updateAutoRenew(domains, status) {
  return apiFetch(`${BASE}/auto-renew`, {
    method: 'POST',
    body: JSON.stringify({ domains, status })
  })
}

// DNS Records
export function getDnsRecords(domain) {
  return apiFetch(`${BASE}/dns/${domain}`)
}

export function createDnsRecord(domain, record) {
  return apiFetch(`${BASE}/dns/${domain}`, {
    method: 'POST',
    body: JSON.stringify(record)
  })
}

export function updateDnsRecord(domain, id, record) {
  return apiFetch(`${BASE}/dns/${domain}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(record)
  })
}

export function deleteDnsRecord(domain, id) {
  return apiFetch(`${BASE}/dns/${domain}/${id}`, {
    method: 'DELETE'
  })
}

// URL Forwarding
export function getUrlForwards(domain) {
  return apiFetch(`${BASE}/forwards/${domain}`)
}

export function addUrlForward(domain, forward) {
  return apiFetch(`${BASE}/forwards/${domain}`, {
    method: 'POST',
    body: JSON.stringify(forward)
  })
}

export function deleteUrlForward(domain, id) {
  return apiFetch(`${BASE}/forwards/${domain}/${id}`, {
    method: 'DELETE'
  })
}

// Glue Records
export function getGlueRecords(domain) {
  return apiFetch(`${BASE}/glue/${domain}`)
}

export function createGlueRecord(domain, subdomain, ips) {
  return apiFetch(`${BASE}/glue/${domain}/${subdomain}`, {
    method: 'POST',
    body: JSON.stringify({ ips })
  })
}

export function updateGlueRecord(domain, subdomain, ips) {
  return apiFetch(`${BASE}/glue/${domain}/${subdomain}`, {
    method: 'PUT',
    body: JSON.stringify({ ips })
  })
}

export function deleteGlueRecord(domain, subdomain) {
  return apiFetch(`${BASE}/glue/${domain}/${subdomain}`, {
    method: 'DELETE'
  })
}

// SSL
export function getSSLCertificate(domain) {
  return apiFetch(`${BASE}/ssl/${domain}`)
}

// DNSSEC
export function getDnssecRecords(domain) {
  return apiFetch(`${BASE}/dnssec/${domain}`)
}

export function createDnssecRecord(domain, record) {
  return apiFetch(`${BASE}/dnssec/${domain}`, {
    method: 'POST',
    body: JSON.stringify(record)
  })
}

export function deleteDnssecRecord(domain, keyTag) {
  return apiFetch(`${BASE}/dnssec/${domain}/${keyTag}`, {
    method: 'DELETE'
  })
}

// Marketplace
export function getMarketplaceListings(start = 0, limit = 1000) {
  return apiFetch(`${BASE}/marketplace?start=${start}&limit=${limit}`)
}
