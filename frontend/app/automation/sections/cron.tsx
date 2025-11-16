"use client";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Copy, Terminal, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// Example data (replace with backend API)
const cronHistory = [
  { time: "3 minutes ago", status: "Success" },
  { time: "1 hour ago", status: "Success" },
  { time: "2 hours ago", status: "Failed" },
];

export default function CronTab() {
  const cronCommand =
    "*/5 * * * * node /var/www/html/scripts/runCron.js >> /dev/null 2>&1";

  const copyCommand = () => {
    navigator.clipboard.writeText(cronCommand);
    toast.success("Cron command copied to clipboard!");
  };

  return (
    <div className="space-y-8">

      {/* SECTION: CRON STATUS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" /> Cron Job Status
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">

          {/* Status Grid */}
          <div className="grid grid-cols-2 gap-6">

            {/* Last Run */}
            <div className="p-4 rounded-lg border bg-muted/40">
              <p className="text-sm text-muted-foreground mb-1">Last Cron Run</p>
              <p className="font-medium">3 minutes ago</p>
              <Badge className="mt-2 bg-green-600">OK</Badge>
            </div>

            {/* Cron Health */}
            <div className="p-4 rounded-lg border bg-muted/40">
              <p className="text-sm text-muted-foreground mb-1">Cron Health</p>
              <p className="font-medium">Running Normally</p>
              <Badge className="mt-2 bg-green-600">Healthy</Badge>
            </div>

          </div>

          <Separator />

          {/* Recommended Cron Command */}
          <div>
            <p className="text-sm font-medium mb-2">Recommended Cron Command</p>

            <div className="p-3 rounded-md bg-black text-white text-xs font-mono flex justify-between items-center">
              <span className="break-all">{cronCommand}</span>

              <Button
                variant="secondary"
                size="icon"
                className="ml-3 bg-white text-black hover:bg-muted"
                onClick={copyCommand}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <Button
              className="mt-4 w-[200px] bg-yellow-500 hover:bg-yellow-600 text-black"
              onClick={() => toast("Testing cron… (mock)")}
            >
              <Terminal className="h-4 w-4 mr-2" />
              Test Cron Execution
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SECTION: CRON HISTORY */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Cron Execution History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cronHistory.map((row, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-md border"
              >
                <p className="text-sm">{row.time}</p>

                {row.status === "Success" ? (
                  <Badge className="bg-green-600">Success</Badge>
                ) : (
                  <Badge className="bg-red-600">Failed</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SECTION: FAILURE LOGS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Cron Failure Log
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="p-4 rounded-md bg-red-100 border border-red-300 text-red-800 text-sm">
            No recent cron failures detected.
            {/* Replace with dynamic logs from backend */}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
