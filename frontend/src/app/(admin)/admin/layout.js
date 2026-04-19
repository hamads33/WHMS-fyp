"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { BroadcastBanner } from "@/components/broadcast-banner";
import { useAuth } from "@/lib/context/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";
import { ClientBroadcastAPI } from "@/lib/api/broadcast";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const {
    user,
    loading,
    isAuthenticated,
    isAdmin,
    impersonating,
    impersonator,
    stopImpersonation,
  } = useAuth();

  // Check authentication and authorization
  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.push("/admin/login");
      return;
    }

    if (!isAdmin) {
      // If impersonating, redirect to client portal instead of unauthorized
      router.push(impersonating ? "/client/dashboard" : "/unauthorized");
      return;
    }
  }, [isAuthenticated, isAdmin, impersonating, loading, router]);

  // Fetch broadcast notifications
  useEffect(() => {
    if (!isAuthenticated) return;
    ClientBroadcastAPI.getNotifications()
      .then(res => setNotifications(res.data || []))
      .catch(() => {});
  }, [isAuthenticated]);

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
            onClick={() => stopImpersonation()}
            className="bg-background text-foreground px-3 py-1 rounded font-medium hover:bg-accent transition-colors"
          >
            Stop Impersonation
          </button>
        </div>
      )}

      {/* Broadcast Notifications Banner */}
      <BroadcastBanner
        broadcasts={notifications}
        onDismiss={async (id) => {
          await ClientBroadcastAPI.dismiss(id);
          setNotifications(prev => prev.filter(n => n.id !== id));
        }}
      />

      {/* Main Admin Layout */}
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminHeader />

          <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-6">
            {children}
          </main>
        </div>
      </div>

      <Toaster />
    </div>
  );
}