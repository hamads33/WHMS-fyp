"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { useAuth } from "@/lib/context/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const {
    user,
    loading,
    isAuthenticated,
    isAdmin,
    impersonating,
    impersonator,
    loadSession,
  } = useAuth();

  // Check authentication and authorization
  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!isAdmin) {
      router.push("/unauthorized");
      return;
    }
  }, [isAuthenticated, isAdmin, loading, router]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return null; // Will redirect
  }

  // Not admin
  if (!isAdmin) {
    return null; // Will redirect
  }

  // Stop impersonation handler
  async function handleStopImpersonation() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/impersonate/stop`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            sessionId: user.sessionId // If you track session IDs
          }),
        }
      );

      if (response.ok) {
        await loadSession();
        router.push("/admin/dashboard");
      }
    } catch (error) {
      console.error("Failed to stop impersonation:", error);
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Impersonation Banner */}
      {impersonating && (
        <div className="w-full bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between text-sm shadow-lg">
          <div className="flex items-center gap-4">
            <span className="font-semibold">🔥 IMPERSONATION MODE</span>
            <span>
              Viewing as: <strong>{user?.email}</strong>
            </span>
            {impersonator && (
              <span className="text-xs opacity-90">
                Admin: {impersonator.email}
              </span>
            )}
          </div>

          <button
            onClick={handleStopImpersonation}
            className="bg-background text-foreground px-3 py-1 rounded font-medium hover:bg-accent transition-colors"
          >
            Stop Impersonation
          </button>
        </div>
      )}

      {/* Main Admin Layout */}
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminHeader />

          <main className="flex-1 overflow-y-auto bg-background p-6">
            {children}
          </main>
        </div>
      </div>

      <Toaster />
    </div>
  );
}