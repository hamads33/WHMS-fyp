"use client";

import type React from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminHeader } from "@/components/admin-header";
import useAdminGuard from "@/hooks/useAdminGuard";
import { useAuth } from "@/hooks/useAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const {
    user,
    loading,
    isImpersonating,
    impersonatorId,
    impersonateStop,
  } = useAuth();

  // Normalize data
  const roles = user?.roles ?? [];
  const portals = user?.portals ?? [];

  // Debug (safe)
  console.log("🔍 ADMIN LAYOUT DEBUG:", { user, loading, roles, portals });

  // Access control via guard
  const allowed = useAdminGuard(user);

  // ---------------------------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg">Checking access…</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // ACCESS DENIED
  // ---------------------------------------------------------------------------
  if (!allowed) {
    console.warn("❌ ACCESS DENIED — AdminLayout", { roles, portals });

    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-600 text-lg">Access denied.</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STOP IMPERSONATION
  // ---------------------------------------------------------------------------
  async function handleStop() {
    await impersonateStop();
  }

  console.log("✅ ACCESS GRANTED — Admin Portal Loaded");

  // ---------------------------------------------------------------------------
  // LAYOUT
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* 🔥 IMPERSONATION BANNER */}
      {isImpersonating && (
        <div className="w-full bg-red-600 text-white px-4 py-2 flex items-center justify-between text-sm">
          <div>
            🔥 <strong>Impersonating:</strong> {user?.email ?? "Unknown User"}  
            &nbsp;|&nbsp;
            <strong>Admin:</strong> {impersonatorId ?? "??"}
          </div>

          <button
            onClick={handleStop}
            className="bg-white text-red-700 px-3 py-1 rounded font-medium hover:bg-gray-200"
          >
            Stop Impersonation
          </button>
        </div>
      )}

      {/* MAIN ADMIN LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminHeader />

          <main className="flex-1 overflow-y-auto bg-background p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
