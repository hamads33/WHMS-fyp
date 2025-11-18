"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/app/automation/utils/api";

export function useActions() {
  const query = useQuery({
    queryKey: ["actions"],
    queryFn: async () => {
      const res = await api.get("/actions");
      return res.data || [];
    },
  });

  return {
    actions: query.data ?? [],   // ✅ always return an array
    isLoading: query.isLoading,
    error: query.error,
  };
}
