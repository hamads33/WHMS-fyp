// /frontend/app/automation/utils/api.ts

import {
  Profile,
  Task,
  ActionItem,
  PluginItem,
  PluginUploadResponse,
} from "./types";

const BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const AUTO = `${BASE}/automation`;

/* ---------------------------- Generic Fetch Wrapper ---------------------------- */
async function http<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}

/* -------------------------------- Profiles ----------------------------------- */
export const getProfiles = () =>
  http<Profile[]>(`${AUTO}/profiles`);

export const getProfile = (id: number) =>
  http<Profile>(`${AUTO}/profiles/${id}`);

export const createProfile = (data: Partial<Profile>) =>
  http<Profile>(`${AUTO}/profiles`, {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });

export const updateProfile = (id: number, data: Partial<Profile>) =>
  http<Profile>(`${AUTO}/profiles/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });

export const deleteProfile = (id: number) =>
  http<void>(`${AUTO}/profiles/${id}`, {
    method: "DELETE",
  });

/* ---------------------------------- Tasks ------------------------------------ */
export const getTask = (id: number) =>
  http<Task>(`${AUTO}/tasks/${id}`);

export const createTask = (data: Partial<Task>) =>
  http<Task>(`${AUTO}/tasks`, {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });

export const updateTask = (id: number, data: Partial<Task>) =>
  http<Task>(`${AUTO}/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });

export const deleteTask = (id: number) =>
  http<void>(`${AUTO}/tasks/${id}`, {
    method: "DELETE",
  });

export const runTask = (id: number) =>
  http(`${AUTO}/tasks/${id}/run`, {
    method: "POST",
  });

/* --------------------------------- Actions ----------------------------------- */
export const listActions = () =>
  http<ActionItem[]>(`${AUTO}/actions`);

export const testAction = (actionId: string, config: any) =>
  http(`${AUTO}/actions/${actionId}/test`, {
    method: "POST",
    body: JSON.stringify(config),
    headers: { "Content-Type": "application/json" },
  });

/* --------------------------------- Plugins ----------------------------------- */
export const listPlugins = async () => {
  const res = await http<{ plugins: PluginItem[] }>(`${AUTO}/plugins`);
  return res.plugins;
};

// FIXED — NO AXIOS, 100% correct multipart upload
export const uploadPlugin = async (
  file: File
): Promise<PluginUploadResponse> => {
  const form = new FormData();
  form.append("plugin", file);

  const res = await fetch(`${AUTO}/plugins/upload`, {
    method: "POST",
    body: form,
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
};

/* ------------------------------ Cron Builder API ------------------------------ */
export const cronBuild = (data: any) =>
  http(`${AUTO}/cron/build`, {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });

export const cronValidate = (expr: string) =>
  http(`${AUTO}/cron/validate`, {
    method: "POST",
    body: JSON.stringify({ expression: expr }),
    headers: { "Content-Type": "application/json" },
  });
