import { useMemo } from "react";
import type { AuthUser } from "@/hooks/useAuth";

export default function useAdminGuard(user: AuthUser | null) {
  return useMemo(() => {
    if (!user) return false;

    const roles = user.roles ?? [];
    return roles.some((r) =>
      ["superadmin", "admin", "staff"].includes(r)
    );
  }, [user]);
}
