export type Profile = {
  id: string;
  name: string;
  description?: string;
  cron?: string;
  enabled?: boolean;
};

export type Task = {
  id: string;
  name: string;
  cron: string;
  actionType: string;
  actionMeta: any;
  order?: number;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: string;
};

export type ApiResult<T> = ApiSuccess<T> | ApiError;

const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

async function req<T>(path: string, opts: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...opts,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return { success: false, error: json?.error || res.statusText };
    }

    return { success: true, data: json.data as T };
  } catch (e: any) {
    return { success: false, error: e?.message || "Network error" };
  }
}

/* ------------------ PROFILES ------------------ */

export function listProfiles() {
  return req<Profile[]>(`/api/automation/profiles`);
}

export function getProfile(id: string) {
  return req<Profile>(`/api/automation/profiles/${id}`);
}

export function createProfile(body: Partial<Profile>) {
  return req<Profile>(`/api/automation/profiles`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateProfile(id: string, body: Partial<Profile>) {
  return req<Profile>(`/api/automation/profiles/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteProfile(id: string) {
  return req<{}>(`/api/automation/profiles/${id}`, { method: "DELETE" });
}

export function enableProfile(id: string) {
  return req<{}>(`/api/automation/profiles/${id}/enable`, { method: "POST" });
}

export function disableProfile(id: string) {
  return req<{}>(`/api/automation/profiles/${id}/disable`, { method: "POST" });
}

export function runProfile(id: string) {
  return req<{}>(`/api/automation/run/${id}`, { method: "POST" });
}

/* ------------------ TASKS ------------------ */

export function listTasks(profileId: string) {
  return req<Task[]>(`/api/automation/profiles/${profileId}/tasks`);
}

export function getTask(id: string) {
  return req<Task>(`/api/automation/tasks/${id}`);
}

export function createTask(profileId: string, body: Partial<Task>) {
  return req<Task>(`/api/automation/profiles/${profileId}/tasks`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateTask(id: string, body: Partial<Task>) {
  return req<Task>(`/api/automation/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteTask(id: string) {
  return req<{}>(`/api/automation/tasks/${id}`, { method: "DELETE" });
}

export function runTask(id: string) {
  return req<{}>(`/api/automation/tasks/${id}/run`, { method: "POST" });
}
