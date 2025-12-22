"use client";
import useSWR from "swr";
import { SessionAPI } from "@/lib/sessions";

export function useSession() {
  const { data, error, mutate, isLoading } = useSWR(
    "/auth/session",
    SessionAPI.getCurrent
  );

  return {
    user: data?.user ?? null,
    portal: data?.portal ?? null,
    impersonating: data?.impersonating ?? false,
    impersonator: data?.impersonator ?? null,
    loading: isLoading,
    error,
    refresh: mutate,
  };
}
