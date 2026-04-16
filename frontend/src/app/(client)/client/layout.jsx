"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { Sidebar } from "@/components/portal/sidebar";
import { Header } from "@/components/portal/header";
import { BroadcastBanner } from "@/components/broadcast-banner";
import { Toaster } from "@/components/ui/toaster";
import { ClientBroadcastAPI } from "@/lib/api/broadcast";
import { CartProvider } from "@/lib/context/CartContext";
import { CartDrawer } from "@/components/portal/cart-drawer";
import { CartButton } from "@/components/portal/cart-button";

export default function ClientLayout({ children }) {
  const router = useRouter();
  const { user, isAuthenticated, loading, isClient, impersonating, stopImpersonation } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Allow access if:
    // - user has client role, OR
    // - admin is impersonating (backend forces client portal regardless of target's roles)
    if (!isClient && !impersonating) {
      router.push("/admin/dashboard");
      return;
    }
  }, [isAuthenticated, loading, isClient, impersonating, router]);

  // Fetch broadcast notifications
  useEffect(() => {
    if (!isAuthenticated) return;
    ClientBroadcastAPI.getNotifications()
      .then(res => setNotifications(res.data || []))
      .catch(() => {});
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Block if not a client AND not impersonating
  if (!isClient && !impersonating) {
    return null;
  }

  return (
    <CartProvider>
    <div className="flex flex-col h-screen bg-background">
      {/* Impersonation Banner */}
      {impersonating && (
        <div className="w-full bg-yellow-400 text-yellow-900 px-4 py-2 flex items-center justify-between text-sm shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold">⚠ ADMIN IMPERSONATION MODE</span>
            <span>Viewing as: <strong>{user?.email}</strong></span>
          </div>
          <button
            onClick={() => stopImpersonation()}
            className="bg-yellow-900 text-yellow-100 px-3 py-1 rounded text-xs font-medium hover:bg-yellow-800 transition-colors"
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

      <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} extraActions={<CartButton />} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>

    <Toaster />
    <CartDrawer />
    </div>
    </CartProvider>
  );
}