"use client";

import { useEffect, useState } from "react";

export function AuditActivityFeed() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadActivity() {
      try {
      const res = await fetch("http://localhost:4000/api/audit/logs?limit=5", {
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
});


        // ❗ Do NOT throw hard errors in dashboard
        if (!res.ok) {
          console.warn("Audit API unavailable:", res.status);
          setError(true);
          return;
        }

        const json = await res.json();
        setLogs(json.data || []);
      } catch (err) {
        console.error("Audit activity fetch failed:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadActivity();
  }, []);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading recent activity…
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-muted-foreground">
        Activity service unavailable
      </p>
    );
  }

  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No recent activity
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-start justify-between border-b pb-3 last:border-0"
        >
          <div>
            <p className="text-sm font-medium">
              {log.action}
            </p>
            <p className="text-xs text-muted-foreground">
              {log.source} • {log.actor}
            </p>
          </div>

          <span className="text-xs text-muted-foreground">
            {new Date(log.createdAt).toLocaleTimeString()}
          </span>
        </div>
      ))}
    </div>
  );
}
