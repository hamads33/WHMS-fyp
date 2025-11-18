"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/app/automation/utils/api";

export type Task = {
  id: number;
  profileId: number;
  name: string;
  actionId: string;
  config: any;
  order: number;
  isActive: boolean;
};

export function useTasks(profileId: number) {
  const queryClient = useQueryClient();
  const API = `/tasks`;

  /** List all tasks for a profile */
  const listQuery = useQuery({
    queryKey: ["tasks", profileId],
    queryFn: async () => {
      const res = await api.get(`/profiles/${profileId}`);
      return res.data?.tasks ?? [];
    },
    enabled: !!profileId,
  });

  /** Create */
  const createTask = useMutation({
    mutationFn: async (data: Partial<Task>) => {
      const res = await api.post(API, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", profileId] });
    },
  });

  /** Update */
  const updateTask = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Task> }) => {
      const res = await api.put(`${API}/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", profileId] });
    },
  });

  /** Delete */
  const deleteTask = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`${API}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", profileId] });
    },
  });

  return {
    tasks: listQuery.data,
    isLoading: listQuery.isLoading,
    createTask,
    updateTask,
    deleteTask,
  };
}
