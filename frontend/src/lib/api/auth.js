import { apiFetch } from "./client";

export function getSession() {
  return apiFetch("/api/auth/sessions/current");
}



export function refreshSession() {
  return apiFetch("/api/auth/refresh", {
    method: "POST",
  });
}
