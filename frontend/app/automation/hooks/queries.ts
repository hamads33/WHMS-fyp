// app/automation/hooks/queries.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/app/automation/api";
import type { Profile, Task } from "@/app/automation/api";

/* Profiles */
export function useProfiles() {
  return useQuery({ queryKey: ["profiles"], queryFn: () => api.listProfiles().then(r => r.data ?? []) });
}

/* Tasks for a profile */
export function useTasks(profileId?: string) {
  return useQuery({
    queryKey: ["tasks", profileId],
    enabled: Boolean(profileId),
    queryFn: () => api.listTasks(profileId!).then(r => r.data ?? []),
  });
}

/* Create / update / delete profiles (optimistic) */
export function useCreateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Profile>) => api.createProfile(payload),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ["profiles"] });
      const previous = qc.getQueryData<Profile[]>(["profiles"]);
      const optimistic = [...(previous ?? []), { id: `temp-${Date.now()}`, name: payload.name ?? "New", description: payload.description ?? "", cron: payload.cron ?? "*/5 * * * *", enabled: false }];
      qc.setQueryData(["profiles"], optimistic);
      return { previous };
    },
    onError: (_err, _vars, context: any) => qc.setQueryData(["profiles"], context?.previous ?? []),
    onSettled: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Profile> }) => api.updateProfile(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: ["profiles"] });
      const previous = qc.getQueryData<Profile[]>(["profiles"]);
      qc.setQueryData(["profiles"], (old: Profile[] | undefined) => (old ?? []).map(p => p.id === id ? { ...p, ...payload } : p));
      return { previous };
    },
    onError: (_err, _vars, context: any) => qc.setQueryData(["profiles"], context?.previous ?? []),
    onSettled: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
  });
}

export function useDeleteProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProfile(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["profiles"] });
      const previous = qc.getQueryData<Profile[]>(["profiles"]);
      qc.setQueryData(["profiles"], (old: Profile[] | undefined) => (old ?? []).filter(p => p.id !== id));
      return { previous };
    },
    onError: (_err, _id, context: any) => qc.setQueryData(["profiles"], context?.previous ?? []),
    onSettled: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
  });
}

/* Tasks mutations with optimistic updates */
export function useCreateTask(profileId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Task>) => api.createTask(profileId!, payload),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ["tasks", profileId] });
      const previous = qc.getQueryData<Task[]>(["tasks", profileId]);
      const temp = { id: `temp-${Date.now()}`, profileId: profileId!, name: payload.name ?? "New", cron: payload.cron ?? "*/5 * * * *", actionType: payload.actionType ?? "", actionMeta: payload.actionMeta ?? {} } as Task;
      qc.setQueryData(["tasks", profileId], (old: Task[] | undefined) => [...(old ?? []), temp]);
      return { previous };
    },
    onError: (_err, _vars, context: any) => qc.setQueryData(["tasks", profileId], context?.previous ?? []),
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks", profileId] }),
  });
}

export function useUpdateTask(profileId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Task> }) => api.updateTask(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: ["tasks", profileId] });
      const previous = qc.getQueryData<Task[]>(["tasks", profileId]);
      qc.setQueryData(["tasks", profileId], (old: Task[] | undefined) => (old ?? []).map(t => t.id === id ? { ...t, ...payload } : t));
      return { previous };
    },
    onError: (_err, _vars, context: any) => qc.setQueryData(["tasks", profileId], context?.previous ?? []),
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks", profileId] }),
  });
}

export function useDeleteTask(profileId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["tasks", profileId] });
      const previous = qc.getQueryData<Task[]>(["tasks", profileId]);
      qc.setQueryData(["tasks", profileId], (old: Task[] | undefined) => (old ?? []).filter(t => t.id !== id));
      return { previous };
    },
    onError: (_err, _id, context: any) => qc.setQueryData(["tasks", profileId], context?.previous ?? []),
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks", profileId] }),
  });
}

/* Run task (no optimistic) */
export function useRunTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.runTask(taskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

/* Task run history */
export function useTaskHistory(taskId?: string) {
  return useQuery({
    queryKey: ["taskHistory", taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"}/api/automation/tasks/${taskId}/history`);
      if (!res.ok) throw new Error("Failed loading history");
      const json = await res.json();
      return json.data ?? json;
    },
  });
}
