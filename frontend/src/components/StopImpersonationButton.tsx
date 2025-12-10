"use client";

import { Button } from "@/components/ui/button";
import { AuthAPI } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";

export function StopImpersonationButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const stop = async () => {
    const sessionId = localStorage.getItem("impersonationSessionId");
    if (!sessionId) return alert("No active impersonation session found.");

    setLoading(true);

    try {
      await AuthAPI.impersonateStop({ sessionId });

      // Clear tokens + impersonation info
      localStorage.removeItem("impersonationSessionId");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");

      router.push("/admin/dashboard"); // go back to admin
    } catch (err) {
      console.error(err);
      alert("Failed to stop impersonation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="destructive" onClick={stop} disabled={loading}>
      <LogOut className="h-4 w-4 mr-2" />
      {loading ? "Stopping..." : "Stop Impersonation"}
    </Button>
  );
}
