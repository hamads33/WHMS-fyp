"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/app/automation/utils/api";

export function useRunById(id: number) {
  return useQuery({
    queryKey: ["runs", id],
    queryFn: async () => {
      const res = await api.get(`/runs/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}
