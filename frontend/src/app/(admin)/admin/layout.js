"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { useAuth } from "@/lib/auth/AuthContext";

export default function AdminLayout({ children }) {
  const {
    user,
    loading,
    impersonating,
    impersonator,
    reloadSession,
  } = useAuth();

  // ---------------------------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg">Loading admin portal…</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // ACCESS SAFETY (frontend only – backend is source of truth)
  // ---------------------------------------------------------------------------
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-600 text-lg">Not authenticated.</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STOP IMPERSONATION
  // ---------------------------------------------------------------------------
  async function handleStopImpersonation() {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/impersonate/stop`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    await reloadSession();
  }

  // ---------------------------------------------------------------------------
  // LAYOUT
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* 🔥 IMPERSONATION BANNER */}
      {impersonating && (
        <div className="w-full bg-red-600 text-white px-4 py-2 flex items-center justify-between text-sm">
          <div>
            🔥 <strong>Impersonating:</strong> {user?.email} &nbsp;|&nbsp;
            <strong>Admin:</strong> {impersonator?.email ?? "Unknown"}
          </div>

          <button
            onClick={handleStopImpersonation}
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
