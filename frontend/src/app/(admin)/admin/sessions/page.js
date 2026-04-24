"use client";

import { useState } from "react";
import {
  MonitorSmartphone,
  Clock,
  LogOut,
  Shield,
  AlertTriangle,
  Laptop,
  Smartphone,
  Globe,
  Trash2,
  MapPin,
  Calendar,
} from "lucide-react";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { SessionsAPI } from "@/lib/sessions";

/* ---------------------------------------------------------
   User Agent Parser
--------------------------------------------------------- */
const parseUserAgent = (ua) => {
  if (!ua) return { device: "Unknown Device", icon: Globe, os: "Unknown" };

  let device = "Unknown Device";
  let icon = Globe;
  let os = "Unknown";

  // Detect OS
  if (ua.includes("Windows NT 10.0")) os = "Windows 10";
  else if (ua.includes("Windows NT 6.3")) os = "Windows 8.1";
  else if (ua.includes("Windows NT 6.1")) os = "Windows 7";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iOS")) os = "iOS";

  // Detect Browser & Device Type
  if (ua.includes("Chrome") && !ua.includes("Edg")) {
    device = `Chrome on ${os}`;
    icon = ua.includes("Android") || ua.includes("iPhone") ? Smartphone : Laptop;
  } else if (ua.includes("Firefox")) {
    device = `Firefox on ${os}`;
    icon = Laptop;
  } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
    device = `Safari on ${os}`;
    icon = ua.includes("iPhone") || ua.includes("iPad") ? Smartphone : Laptop;
  } else if (ua.includes("Edg")) {
    device = `Edge on ${os}`;
    icon = Laptop;
  } else if (ua.includes("Android")) {
    device = "Android Browser";
    icon = Smartphone;
  } else if (ua.includes("iPhone") || ua.includes("iPad")) {
    device = ua.includes("iPhone") ? "iPhone" : "iPad";
    icon = Smartphone;
  } else {
    device = os;
    icon = Globe;
  }

  return { device, icon, os };
};

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */
const formatIp = (ip) => {
  if (!ip) return "—";
  return ip === "::1" ? "127.0.0.1" : ip;
};

const formatRelativeTime = (date) => {
  if (!date) return "—";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const getTimeUntilExpiry = (expiresAt) => {
  if (!expiresAt) return "Unknown";
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry - now;
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 0) return "Expired";
  if (diffHours < 1) return "< 1h";
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
};

/* ---------------------------------------------------------
   Main Component
--------------------------------------------------------- */
export default function SessionsPage() {
  const [isRevokeAllOpen, setIsRevokeAllOpen] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const { data, isLoading, mutate } = useSWR(
    "/auth/sessions",
    SessionsAPI.list
  );

  // Defensive normalization
  const sessions = (data?.sessions || data?.data || []).map((s) => ({
    ...s,
    isCurrent: Boolean(s.isCurrent),
  }));

  const currentSession = sessions.find((s) => s.isCurrent);
  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  /* ---------------------------------------------------------
     Auto-clear messages
  --------------------------------------------------------- */
  useState(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useState(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  /* ---------------------------------------------------------
     Handlers
  --------------------------------------------------------- */
  const handleRevokeSession = async (session) => {
    if (session.isCurrent) {
      setError("Cannot revoke your current session");
      return;
    }

    try {
      setRevokingId(session.id);
      setError(null);
      await SessionsAPI.revoke(session.id);
      setSuccess("Session revoked successfully");
      await mutate();
    } catch (err) {
      console.error("Failed to revoke session:", err);
      setError(err?.message || "Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    try {
      setError(null);
      await SessionsAPI.revokeOthers();
      setSuccess(`${otherSessionsCount} sessions revoked successfully`);
      await mutate();
      setIsRevokeAllOpen(false);
    } catch (err) {
      console.error("Failed to revoke sessions:", err);
      setError(err?.message || "Failed to revoke sessions");
    }
  };

  /* ---------------------------------------------------------
     Render
  --------------------------------------------------------- */
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Active Sessions
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your login sessions and secure your account
          </p>
        </div>

        {otherSessionsCount > 0 && (
          <Button
            variant="destructive"
            className="gap-2 w-full md:w-auto"
            onClick={() => setIsRevokeAllOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Revoke All Other Sessions ({otherSessionsCount})
          </Button>
        )}
      </div>

      {/* Security Notice */}
      <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-800 dark:text-blue-200">
          Security Tip
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          If you see any unfamiliar sessions, revoke them immediately and change
          your password. Each session represents a device where you are logged in.
        </AlertDescription>
      </Alert>

      {/* Success Alert */}
      {success && (
        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-800 dark:text-green-200">
            Success
          </AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <MonitorSmartphone className="h-4 w-4" />
              Total Sessions
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              {sessions.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Active login sessions across all devices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Laptop className="h-4 w-4" />
              Other Devices
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              {otherSessionsCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Sessions excluding your current device
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Session Timeout
            </CardDescription>
            <CardTitle className="text-3xl font-bold">24h</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Sessions expire after 24 hours of inactivity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Active Sessions</CardTitle>
          <CardDescription>
            Manage all devices where you are currently logged in
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No active sessions found
            </div>
          ) : (
            <div className="rounded-md border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device & Location</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="w-[100px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => {
                    const { device, icon: Icon } = parseUserAgent(
                      session.userAgent
                    );
                    const isRevoking = revokingId === session.id;

                    return (
                      <TableRow
                        key={session.id}
                        className={
                          session.isCurrent ? "bg-primary/5 border-primary/20" : ""
                        }
                      >
                        {/* Device & Location */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{device}</p>
                                {session.isCurrent && (
                                  <Badge
                                    variant="default"
                                    className="shrink-0"
                                  >
                                    Current
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* IP Address */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-mono text-sm">
                              {formatIp(session.ip)}
                            </span>
                          </div>
                        </TableCell>

                        {/* Activity */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {formatRelativeTime(session.createdAt)}
                              </span>
                            </div>
                            {session.lastActivity && (
                              <div className="flex items-center gap-1.5 text-sm">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {formatRelativeTime(session.lastActivity)}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Expires */}
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">
                              {getTimeUntilExpiry(session.expiresAt)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(session.expiresAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </p>
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={session.isCurrent || isRevoking}
                            onClick={() => handleRevokeSession(session)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {isRevoking ? (
                              "Revoking..."
                            ) : (
                              <>
                                <LogOut className="h-4 w-4 mr-2" />
                                Revoke
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke All Confirmation Dialog */}
      <Dialog open={isRevokeAllOpen} onOpenChange={setIsRevokeAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke All Other Sessions?</DialogTitle>
            <DialogDescription>
              This will sign you out from all other devices. You will remain
              logged in on this device only.
            </DialogDescription>
          </DialogHeader>

          <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">
              Warning
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              This will immediately end {otherSessionsCount} other session
              {otherSessionsCount !== 1 ? "s" : ""}. You will need to log in
              again on those devices.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRevokeAllOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevokeAllOthers}>
              <LogOut className="mr-2 h-4 w-4" />
              Revoke All ({otherSessionsCount})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
