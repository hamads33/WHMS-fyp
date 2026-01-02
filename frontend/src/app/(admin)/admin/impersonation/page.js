"use client";

import { useState, useEffect } from "react";
import { UserCheck, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { ImpersonationAPI } from "@/lib/impersonation";
import { AuthAPI } from "@/lib/api/auth";
import { useRouter } from "next/navigation";

export default function ImpersonationPage() {
  const router = useRouter();

  // State management
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [reason, setReason] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState(null);

  // ------------------------------------------------------------------
  // Load users on mount
  // ------------------------------------------------------------------
  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true);
        const response = await AuthAPI.listUsers();
        setUsers(response?.users || response?.data || []);
      } catch (err) {
        console.error("Failed to load users:", err);
        setError("Failed to load users. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, []);

  // ------------------------------------------------------------------
  // Filter users based on search query
  // ------------------------------------------------------------------
  const filteredUsers = users.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user?.name?.toLowerCase().includes(searchLower) ||
      user?.email?.toLowerCase().includes(searchLower) ||
      user?.id?.toLowerCase().includes(searchLower)
    );
  });

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------
  const handleImpersonate = (user) => {
    setSelectedUser(user);
    setReason("");
    setError(null);
    setIsConfirmOpen(true);
  };

  const startImpersonation = async () => {
    if (!selectedUser) return;

    if (!reason.trim()) {
      setError("Please provide a reason for impersonation");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await ImpersonationAPI.start({
        targetUserId: selectedUser.id,
        reason: reason.trim(),
      });

      if (result.accessToken) {
        localStorage.setItem("accessToken", result.accessToken);
      }
      if (result.refreshToken) {
        localStorage.setItem("refreshToken", result.refreshToken);
      }

      setIsConfirmOpen(false);

      // ✅ FIX (ONLY CHANGE): role-aware redirect
      const roles = result?.targetUser?.roles || [];

      if (roles.includes("admin") || roles.includes("superadmin")) {
        router.push("/admin");
      } else {
        router.push("/clients");
      }

      router.refresh();
    } catch (err) {
      console.error("Impersonation failed:", err);
      setError(err?.message || "Failed to start impersonation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDialog = () => {
    setIsConfirmOpen(false);
    setSelectedUser(null);
    setReason("");
    setError(null);
  };

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Impersonation</h1>
        <p className="text-muted-foreground mt-2">
          Select a user to impersonate for support and troubleshooting purposes.
        </p>
      </div>

      {/* Security Warning */}
      <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">
          Security Notice
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          All impersonation sessions are logged and audited. Only use this feature
          for legitimate support requests and administrative tasks.
        </AlertDescription>
      </Alert>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Card */}
      <Card>
        <CardHeader>
          <CardTitle>Select User to Impersonate</CardTitle>
          <CardDescription>
            Search for a user by name, email, or ID
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or ID..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loading}
            />
          </div>

          {loading && users.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Loading users...
            </div>
          )}

          {!loading && filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? "No users found matching your search"
                : "No users available"}
            </div>
          )}

          {filteredUsers.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredUsers.map((user) => (
                <Card
                  key={user.id}
                  className="border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleImpersonate(user)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {user?.name?.charAt(0)?.toUpperCase() ||
                            user?.email?.charAt(0)?.toUpperCase() ||
                            "?"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {user.name || "Unnamed User"}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>

                      <Button size="sm" variant="ghost" className="shrink-0">
                        <UserCheck className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredUsers.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Impersonation</DialogTitle>
            <DialogDescription>
              You are about to impersonate{" "}
              <span className="font-semibold text-foreground">
                {selectedUser?.name || selectedUser?.email}
              </span>
              . This action will be logged for security purposes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">
                Reason for Impersonation{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Example: Investigating billing issue for ticket #12345..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground">
                Provide a clear reason for audit trail purposes
              </p>
            </div>

            {selectedUser && (
              <div className="rounded-lg border p-3 space-y-1 bg-muted/50">
                <p className="text-sm font-medium">Target User Details:</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Name:</span>{" "}
                  {selectedUser.name || "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Email:</span>{" "}
                  {selectedUser.email}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">ID:</span> {selectedUser.id}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelDialog}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={startImpersonation}
              disabled={loading || !reason.trim()}
            >
              {loading ? "Starting..." : "Start Impersonation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
