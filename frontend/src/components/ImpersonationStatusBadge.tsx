"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";
import { StopImpersonationButton } from "./StopImpersonationButton";
import { AuthAPI } from "@/lib/auth";

export function ImpersonationStatusBadge() {
  const [status, setStatus] = useState<{ isImpersonation: boolean } | null>(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await AuthAPI.impersonationStatus();
        setStatus(res);
      } catch (err) {
        console.error("Status check failed:", err);
      }
    }

    loadStatus();
  }, []);

  if (!status?.isImpersonation) return null;

  return (
    <div className="flex items-center gap-3">
      <Badge className="bg-yellow-600 text-white flex items-center gap-2">
        <ShieldAlert className="h-4 w-4" />
        Impersonating User
      </Badge>

      <StopImpersonationButton />
    </div>
  );
}
