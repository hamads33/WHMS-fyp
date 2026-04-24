"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { Activity } from "lucide-react";

function dotColor(action = "") {
  const a = action.toLowerCase();
  if (a.includes("delete") || a.includes("fail") || a.includes("error") || a.includes("ban"))
    return "bg-red-500";
  if (a.includes("create") || a.includes("register") || a.includes("success") || a.includes("activate"))
    return "bg-emerald-500";
  if (a.includes("update") || a.includes("edit") || a.includes("change") || a.includes("impersonat"))
    return "bg-amber-400";
  if (a.includes("login") || a.includes("logout") || a.includes("auth"))
    return "bg-blue-500";
  return "bg-gray-300 dark:bg-gray-600";
}

function ringColor(action = "") {
  const a = action.toLowerCase();
  if (a.includes("delete") || a.includes("fail") || a.includes("error") || a.includes("ban"))
    return "ring-red-100 dark:ring-red-900/30";
  if (a.includes("create") || a.includes("register") || a.includes("success") || a.includes("activate"))
    return "ring-emerald-100 dark:ring-emerald-900/30";
  if (a.includes("update") || a.includes("edit") || a.includes("change") || a.includes("impersonat"))
    return "ring-amber-100 dark:ring-amber-900/30";
  if (a.includes("login") || a.includes("logout") || a.includes("auth"))
    return "ring-blue-100 dark:ring-blue-900/30";
  return "ring-gray-100 dark:ring-gray-800";
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function AuditActivityFeed() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch("/audit/logs?limit=8")
      .then((json) => setLogs(json.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-2 space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5">
            <div className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-44 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
              <div className="h-2.5 w-28 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
            </div>
            <div className="h-3 w-10 rounded bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  if (error || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2.5">
          <Activity className="h-4 w-4 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {error ? "Activity unavailable" : "No recent activity"}
        </p>
      </div>
    );
  }

  return (
    <div className="py-2 divide-y divide-gray-100 dark:divide-gray-800/70">
      {logs.map((log) => (
        <div key={log.id} className="flex items-center gap-3 py-2.5">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2 ${ringColor(log.action)}`}>
            <span className={`h-2 w-2 rounded-full ${dotColor(log.action)}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate leading-snug">{log.action}</p>
            {(log.source || log.actor) && (
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {[log.source, log.actor].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <span className="text-xs text-gray-400 shrink-0 tabular-nums">
            {timeAgo(log.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
