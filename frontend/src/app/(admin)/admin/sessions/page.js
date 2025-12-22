"use client";

import {
  MonitorSmartphone,
  Clock,
  LogOut,
  MoreHorizontal,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";

import { SessionsAPI } from "@/lib/sessions";
const parseUserAgent = (ua) => {
  if (!ua) return "Unknown Device";

  if (ua.includes("Chrome") && ua.includes("Linux")) return "Chrome on Linux";
  if (ua.includes("Chrome") && ua.includes("Windows")) return "Chrome on Windows";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Android")) return "Android Device";
  if (ua.includes("iPhone")) return "iPhone";

  return "Unknown Device";
};

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */
const formatIp = (ip) => {
  if (!ip) return "—";
  return ip === "::1" ? "127.0.0.1" : ip;
};

/* ---------------------------------------------------------
   Page
--------------------------------------------------------- */
export default function SessionsPage() {
  const { data, isLoading, mutate } = useSWR(
    "/api/auth/sessions",
    SessionsAPI.list
  );

  // Defensive normalization (VERY IMPORTANT)
  const sessions = (data?.sessions || []).map((s) => ({
    ...s,
    isCurrent: Boolean(s.isCurrent),
  }));

  /* ---------------------------------------------------------
     Table Columns
  --------------------------------------------------------- */
  const columns = [
    {
      key: "device",
      header: "Device",
      render: (session) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <MonitorSmartphone className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">
              {parseUserAgent(session.userAgent)}

            </p>
            <p className="text-sm text-muted-foreground">
              {formatIp(session.ip)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "ip",
      header: "IP Address",
      render: (session) => (
        <span className="font-mono text-sm">
          {formatIp(session.ip)}
        </span>
      ),
    },
    {
      key: "started",
      header: "Started",
      render: (session) => (
        <span className="text-muted-foreground">
          {new Date(session.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "expires",
      header: "Expires At",
      render: (session) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {new Date(session.expiresAt).toLocaleString()}
          </span>
          {session.isCurrent && (
            <Badge className="bg-success/20 text-success border-success/30">
              Current
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (session) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              disabled={session.isCurrent}
              onClick={async () => {
                await SessionsAPI.revoke(session.id);
                mutate();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Revoke Session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  /* ---------------------------------------------------------
     Render
  --------------------------------------------------------- */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sessions</h1>
          <p className="text-muted-foreground">
            Monitor and manage active user sessions
          </p>
        </div>

        <Button
          variant="destructive"
          className="gap-2"
          onClick={async () => {
            await SessionsAPI.revokeOthers();
            mutate();
          }}
        >
          <LogOut className="h-4 w-4" />
          Revoke All Other Sessions
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Sessions</CardDescription>
            <CardTitle className="text-2xl">
              {sessions.length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Your Sessions</CardDescription>
            <CardTitle className="text-2xl">
              {sessions.length}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Session Timeout</CardDescription>
            <CardTitle className="text-2xl">24h</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>
            All currently active sessions in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={sessions}
            columns={columns}
            loading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
