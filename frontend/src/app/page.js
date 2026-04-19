// Route: app/page.js
// Purpose: Root page with intelligent role-based routing
// Unauthenticated → Shows "Launch WHMS" button
// Admin/Superadmin → Redirects to /admin/dashboard
// Client/Other → Redirects to /client/dashboard

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Wait for auth to load
    if (loading) return;

    // If authenticated, redirect based on role
    if (isAuthenticated && user) {
      // Check if user has admin role
      const isAdmin = user.roles?.includes("admin") || user.roles?.includes("superadmin");
      
      if (isAdmin) {
        router.push("/admin/dashboard");
      } else {
        // All other authenticated users go to client portal
        router.push("/client/dashboard");
      }
      return;
    }
  }, [isAuthenticated, loading, user, router]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show launch button
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white">Welcome to WHMS</h1>
            <p className="text-slate-400">Warehouse Management System</p>
          </div>
          <Button 
            onClick={() => router.push("/login")}
            size="lg"
            className="px-8"
          >
            Launch WHMS
          </Button>
        </div>
      </div>
    );
  }

  // Authenticated - will redirect above
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}