// src/components/ImpersonationBanner.tsx
"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";

export default function ImpersonationBanner() {
  const { user, isImpersonating, impersonatorId, impersonateStop } = useAuth();

  if (!isImpersonating || !user) return null;

  async function handleStop() {
    // try best-effort to stop impersonation
    const result = await impersonateStop();
    if (!result.success) {
      // show a simple alert; replace with your toast system
      alert(result.message || "Unable to stop impersonation — try re-logging in.");
    }
  }

  return (
    <div className="bg-yellow-100 border-yellow-300 text-yellow-800 px-4 py-2 flex items-center justify-between">
      <div>
        You are impersonating <strong>{user.email}</strong>
        {impersonatorId ? <span className="ml-2 text-sm text-gray-600"> (impersonated by {impersonatorId})</span> : null}
      </div>

      <div>
        <button
          className="px-3 py-1 rounded bg-yellow-200 hover:bg-yellow-300"
          onClick={handleStop}
        >
          Stop impersonation
        </button>
      </div>
    </div>
  );
}
