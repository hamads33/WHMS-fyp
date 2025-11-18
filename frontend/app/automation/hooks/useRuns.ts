"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/app/automation/utils/api";

export function useRuns() {
  const query = useQuery({
    queryKey: ["runs"],
    queryFn: async () => {
      const res = await api.get("/runs");
      return res.data || [];
    },
    refetchInterval: 3000, // auto-refresh logs
  });

  return {
    runs: query.data || [],
    isLoading: query.isLoading,
    getRunById: (id: number) =>
      (query.data || []).find((r: any) => r.id === id),
  };
}
