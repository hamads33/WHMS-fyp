import { apiFetch } from "@/lib/api/client";

/**
 * Backup API Client
 * Fixes double-prefixing (e.g., /api/backups/api/backups)
 */
export function backupApi(path, options) {
  // If the path already starts with /api/backups, don't add it again
  const targetPath = path.startsWith("/backups") ? path : `/backups${path}`;
  return apiFetch(targetPath, options);
}