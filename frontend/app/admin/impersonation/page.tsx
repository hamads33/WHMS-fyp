"use client";

import { useState, useEffect } from "react";
import { UserCheck, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

import { AuthAPI } from "@/lib/auth";
import { AdminUsersAPI } from "@/lib/adminUsers";  // <-- ✅ Use REAL admin users list
import { useRouter } from "next/navigation";

export default function ImpersonationPage() {
  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [reason, setReason] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ------------------------------------------------------------------
     1. Load REAL USERS for impersonation
     GET /api/admin/users
  ------------------------------------------------------------------ */
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await AdminUsersAPI.list(); // <-- ✅ Using your generated API client
        setUsers(res.users || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load users");
      }
    }

    loadUsers();
  }, []);

  /* ------------------------------------------------------------------
     2. Search Filter
  ------------------------------------------------------------------ */
  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ------------------------------------------------------------------
     3. Open Confirm Modal
  ------------------------------------------------------------------ */
  const handleImpersonate = (user: any) => {
    setSelectedUser(user);
    setIsConfirmOpen(true);
  };

  /* ------------------------------------------------------------------
     4. Start Impersonation
     /api/auth/impersonate/start
  ------------------------------------------------------------------ */
  const startImpersonation = async () => {
    if (!selectedUser) return;

    setLoading(true);
    setError(null);

    try {
      const result = await AuthAPI.impersonateStart({
        targetUserId: selectedUser.id,
        reason,
      });

      localStorage.setItem("accessToken", result.accessToken);
      localStorage.setItem("refreshToken", result.refreshToken);

      setIsConfirmOpen(false);

      // Redirect to client area
      router.push("/clients");
    } catch (err: any) {
      setError(err?.message || "Failed to impersonate user");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------
     5. RENDER
  ------------------------------------------------------------------ */
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Impersonation</h1>
        <p className="text-muted-foreground">Select any user and impersonate them.</p>
      </div>

      <Alert className="bg-warning/10 border-warning/30">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertTitle className="text-warning">Security Notice</AlertTitle>
        <AlertDescription>
          All impersonation sessions are logged. Only use for valid support actions.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert className="bg-red-100 border-red-300">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Select User</CardTitle>
          <CardDescription>Search any user and impersonate</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((user) => (
              <Card
                key={user.id}
                className="border cursor-pointer hover:bg-muted transition"
                onClick={() => handleImpersonate(user)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-white">
                        {user.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>

                    <Button size="sm" variant="secondary">
                      <UserCheck className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Impersonation</DialogTitle>
            <DialogDescription>
              You are about to impersonate <b>{selectedUser?.name}</b>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <Label>Reason</Label>
            <Textarea
              placeholder="Example: investigating billing issue…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={startImpersonation} disabled={loading}>
              {loading ? "Starting…" : "Start Impersonation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
