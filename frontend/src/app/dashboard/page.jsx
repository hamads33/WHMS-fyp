"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";

export default function DashboardRedirect() {
  const { user, portal, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    switch (portal) {
      case "admin":
        router.replace("/admin/dashboard");
        break;
      case "developer":
        router.replace("/developer/dashboard");
        break;
      default:
        router.replace("/client/dashboard");
    }
  }, [user, portal, loading]);

  return null;
}
