import { apiFetch } from "@/lib/api/client";

/**
 * Storage Config API
 * Backend mount: /api/storage-configs
 */

export function listStorageProviders() {
  return apiFetch("/api/storage-configs/providers");
}

export function listStorageConfigs() {
  return apiFetch("/api/storage-configs");
}

export function createStorageConfig(payload) {
  return apiFetch("/api/storage-configs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function testStorageConfig(payload) {
  return apiFetch("/api/storage-configs/test", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getStorageConfig(id) {
  return apiFetch(`/api/storage-configs/${id}`);
}

export function updateStorageConfig(id, payload) {
  return apiFetch(`/api/storage-configs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteStorageConfig(id) {
  return apiFetch(`/api/storage-configs/${id}`, {
    method: "DELETE",
  });
}
