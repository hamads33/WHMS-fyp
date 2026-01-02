// lib/api/domain.js
import { apiFetch } from "./client";

/* ======================================================
   DOMAINS
====================================================== */

// Get all domains
export function getDomains() {
  return apiFetch("/api/domains");
}

// Get domain by ID
export function getDomainById(id) {
  return apiFetch(`/api/domains/${id}`);
}

// Delete domain (soft delete)
export function deleteDomain(id) {
  return apiFetch(`/api/domains/${id}`, {
    method: "DELETE",
  });
}

// Check domain availability
export function checkDomainAvailability(domain) {
  return apiFetch(
    `/api/domains/availability/check?domain=${encodeURIComponent(domain)}`
  );
}

// WHOIS lookup
export function whoisLookup(domain) {
  return apiFetch(`/api/domains/whois?domain=${encodeURIComponent(domain)}`);
}

// Register domain
export function registerDomain(payload) {
  return apiFetch("/api/domains/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Update nameservers
export function updateNameservers(domainId, nameservers) {
  return apiFetch(`/api/domains/${domainId}/nameservers`, {
    method: "POST",
    body: JSON.stringify({ nameservers }),
  });
}

// Add DNS record
export function addDnsRecord(domainId, record) {
  return apiFetch(`/api/domains/${domainId}/dns`, {
    method: "POST",
    body: JSON.stringify(record),
  });
}

// Get pricing from DB
export function getDomainPricing() {
  return apiFetch("/api/domains/pricing");
}

// Sync pricing from Porkbun → DB
export function syncDomainPricing() {
  return apiFetch("/api/domains/pricing/sync", {
    method: "POST",
  });
}

/* ======================================================
   TLDs
====================================================== */

// Get stored TLDs from DB
export function getTlds() {
  return apiFetch("/api/domains/tlds");
}

// Create or update TLD
export function saveTld(payload) {
  return apiFetch("/api/domains/tlds", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Sync TLD pricing from Porkbun to DB
export function syncTlds() {
  return apiFetch("/api/domains/tlds/sync", {
    method: "POST",
  });
}

// Get live pricing directly from Porkbun API
export function getLiveTldPricing() {
  return apiFetch("/api/domains/tlds/pricing");
}

/* ======================================================
   HELPER: Update TLD in DB (for admin UI)
====================================================== */
export function updateTld(id, payload) {
  return apiFetch(`/api/domains/tlds/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/* ======================================================
   HELPER: Toggle TLD Active Status
====================================================== */
export function toggleTldActive(id, active) {
  return apiFetch(`/api/domains/tlds/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
}