"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/app/automation/utils/api";

export type Profile = {
  id: number;
  name: string;
  cron: string;
  timezone: string;
  isActive: boolean;
  tasks?: any[];
};

const API = "/profiles"; // only relative path

export function useProfiles() {
  const queryClient = useQueryClient();

  /** Fetch all profiles */
  const listQuery = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const res = await api.get(API);
      return res.data || [];
    },
  });

  /** Create profile */
  const createProfile = useMutation({
    mutationFn: async (data: Partial<Profile>) => {
      const res = await api.post(API, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
  });

  return {
    data: listQuery.data,
    isLoading: listQuery.isLoading,
    error: listQuery.error,

    createProfile: createProfile, // <-- use createProfile.mutate()
  };
}

/** Individual profile fetch */
export function useProfile(id: number) {
  return useQuery({
    queryKey: ["profiles", id],
    queryFn: async () => {
      const res = await api.get(`${API}/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}
