// frontend/app/automation/api.ts
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

export type Profile = {
  id: string;
  name: string;
  description?: string;
  cron: string;
  enabled?: boolean;
};

export type Task = {
  id: string;
  profileId: string;
  name: string;
  cron: string;
  actionType: string;
  actionMeta: Record<string, any>;
  order?: number;
};

// Generic request helper
async function request<T = any>(path: string, init?: RequestInit): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: json?.error || res.statusText };
    return { success: true, data: json.data ?? json };
  } catch (e: any) {
    return { success: false, error: e?.message || "Network error" };
  }
}

/* Profiles */
export const listProfiles = () => request<Profile[]>("/api/automation/profiles");
export const getProfile = (id: string) => request<Profile>(`/api/automation/profiles/${id}`);
export const createProfile = (payload: Partial<Profile>) => request<Profile>("/api/automation/profiles", { method: "POST", body: JSON.stringify(payload) });
export const updateProfile = (id: string, payload: Partial<Profile>) => request<Profile>(`/api/automation/profiles/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteProfile = (id: string) => request(`/api/automation/profiles/${id}`, { method: "DELETE" });
export const enableProfile = (id: string) => request(`/api/automation/profiles/${id}/enable`, { method: "POST" });
export const disableProfile = (id: string) => request(`/api/automation/profiles/${id}/disable`, { method: "POST" });
export const runProfile = (id: string) => request(`/api/automation/run/${id}`, { method: "POST" });

/* Tasks */
export const listTasks = (profileId: string) => request<Task[]>(`/api/automation/profiles/${profileId}/tasks`);
export const getTask = (id: string) => request<Task>(`/api/automation/tasks/${id}`);
export const createTask = (profileId: string, payload: Partial<Task>) => request<Task>(`/api/automation/profiles/${profileId}/tasks`, { method: "POST", body: JSON.stringify(payload) });
export const updateTask = (id: string, payload: Partial<Task>) => request<Task>(`/api/automation/tasks/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const deleteTask = (id: string) => request(`/api/automation/tasks/${id}`, { method: "DELETE" });
export const runTask = (id: string) => request(`/api/automation/tasks/${id}/run`, { method: "POST" });

/* Built-in actions + plugin registry */
export const listBuiltInActions = () => request<string[]>("/api/automation/actions");
export const listPlugins = () => request<any[]>("/api/plugins");
export const listPluginActions = (pluginId: string) => request<string[]>(`/api/plugins/${pluginId}/actions`);
export const getPluginManifest = (pluginId: string) => request<any>(`/api/plugins/${pluginId}/manifest`);
export const installPlugin = (file: File) => {
  const fd = new FormData();
  fd.append("file", file);
  return fetch(`${API_BASE}/api/plugins/install`, { method: "POST", body: fd }).then(res => res.json());
};
