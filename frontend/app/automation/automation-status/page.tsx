"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

import {
  Info,
  Timer,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertTriangle,
  PlayCircle,
  Clock,
} from "lucide-react";

import { toast } from "sonner";

// Fake history data (replace with API later)
const cronHistory = [
  { time: "3 minutes ago", status: "success", duration: "1.2 sec" },
  { time: "1 hour ago", status: "success", duration: "1.3 sec" },
  { time: "Yesterday", status: "warning", duration: "3.9 sec" },
  { time: "2 days ago", status: "failed", duration: "0 sec" },
];

const failureLogs = [
  { date: "2 days ago", reason: "Permission denied while executing backup script." },
  { date: "Last Week", reason: "PHP memory limit exceeded during automation task." },
];

export default function AutomationStatussPage() {
  function testCron() {
    toast.success("Cron executed successfully! (Simulated)");
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 52)",
          "--header-height": "calc(var(--spacing) * 10)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="flex flex-col min-h-screen">
        <SiteHeader />

        <div className="flex flex-col px-6 py-8 gap-8">

          {/* Title */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Automation & Cron Status</h1>
            <p className="text-muted-foreground text-sm">
              Manage cron, automation profiles, and system history.
            </p>
          </div>

          {/* Info Banner */}
          <div
            className="rounded-md border p-4 flex items-start gap-3"
            style={{
              backgroundColor: "var(--info-bg)",
              borderColor: "var(--info-border)",
              color: "var(--info-text)",
            }}
          >
            <Info className="h-5 w-5 mt-0.5" />
            <p className="text-sm">
              Ensure your system cron is running every 5 minutes to keep tasks running smoothly.
            </p>
          </div>

          {/* CRON STATUS CARD */}
          <Card>
            <CardHeader>
              <CardTitle>Cron Job Status</CardTitle>
              <CardDescription>Execution status and recommended command.</CardDescription>
            </CardHeader>

            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Last Run */}
              <div className="flex items-center justify-between p-4 border rounded-md bg-muted/50">
                <div>
                  <p className="text-sm font-medium">Last Cron Run</p>
                  <p className="text-sm text-muted-foreground">3 minutes ago</p>
                </div>
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>

              {/* Health */}
              <div className="flex items-center justify-between p-4 border rounded-md bg-muted/50">
                <div>
                  <p className="text-sm font-medium">Cron Health</p>
                  <p className="text-sm text-muted-foreground">Running Normally</p>
                </div>
                <Timer className="h-6 w-6 text-primary" />
              </div>

              {/* Cron Command */}
             {/* Cron Command */}
<div className="col-span-full space-y-3">

  <p className="text-sm font-medium">Recommended Cron Command</p>

  <div className="w-full rounded-md overflow-hidden border bg-black">
    <pre className="p-3 text-white text-xs font-mono whitespace-pre-wrap break-all">
      {"*/5 * * * * node /var/www/html/scripts/runCron.js >> /dev/null 2>&1"}
    </pre>
  </div>

  <Button variant="secondary" size="sm" className="w-full md:w-auto">
    Copy Command
  </Button>

</div>


              {/* Test Cron Button */}
              <div className="col-span-full">
                <Button onClick={testCron} className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4" /> Test Cron Execution
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AUTOMATION PROFILES */}
          <Card>
            <CardHeader>
              <CardTitle>Automation Profiles</CardTitle>
              <CardDescription>Preset automation templates to streamline tasks.</CardDescription>
            </CardHeader>

            <CardContent className="grid md:grid-cols-3 gap-4">

              {/* Daily Profile */}
              <div className="p-4 border rounded-md bg-muted/50 space-y-3">
                <p className="font-medium text-sm">Daily Automation</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Cleanup</span>
                  <Switch checked />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Email Reports</span>
                  <Switch />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Daily Backup</span>
                  <Switch checked />
                </div>
              </div>

              {/* Weekly Profile */}
              <div className="p-4 border rounded-md bg-muted/50 space-y-3">
                <p className="font-medium text-sm">Weekly Automation</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Optimize DB</span>
                  <Switch checked />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Log Rotation</span>
                  <Switch />
                </div>
              </div>

              {/* Custom Profile */}
              <div className="p-4 border rounded-md bg-muted/50 space-y-3">
                <p className="font-medium text-sm">Custom Profile</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Custom Task 1</span>
                  <Switch />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Custom Task 2</span>
                  <Switch />
                </div>
              </div>

            </CardContent>
          </Card>

          {/* CRON FAILURE LOGS */}
          <Card>
            <CardHeader>
              <CardTitle>Cron Failure Logs</CardTitle>
              <CardDescription>Recent errors detected during cron execution.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {failureLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-3 p-3 border rounded-md">
                  <XCircle className="h-5 w-5 text-red-600 mt-1" />
                  <div>
                    <p className="font-medium text-sm">{log.date}</p>
                    <p className="text-xs text-muted-foreground">{log.reason}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* CRON HISTORY TABLE */}
          <Card>
            <CardHeader>
              <CardTitle>Cron Execution History</CardTitle>
              <CardDescription>Last 10 cron runs and their statuses.</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left">Time</th>
                      <th className="py-2 text-left">Status</th>
                      <th className="py-2 text-left">Duration</th>
                    </tr>
                  </thead>

                  <tbody>
                    {cronHistory.map((entry, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-2">{entry.time}</td>

                        <td className="py-2">
                          {entry.status === "success" && (
                            <span className="text-green-600 flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" /> Success
                            </span>
                          )}
                          {entry.status === "warning" && (
                            <span className="text-yellow-600 flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" /> Warning
                            </span>
                          )}
                          {entry.status === "failed" && (
                            <span className="text-red-600 flex items-center gap-2">
                              <XCircle className="h-4 w-4" /> Failed
                            </span>
                          )}
                        </td>

                        <td className="py-2">{entry.duration}</td>
                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>
            </CardContent>
          </Card>

        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
