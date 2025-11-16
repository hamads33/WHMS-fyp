"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Database, CloudUpload, HardDrive, RefreshCw } from "lucide-react";

export default function BackupsTab() {
  const [frequency, setFrequency] = useState("daily");
  const [retention, setRetention] = useState(7);
  const [destination, setDestination] = useState("local");

  const testBackup = () => {
    toast("Running test backup… (mock)");
  };

  return (
    <div className="space-y-8">

      {/* SECTION: BACKUP STATUS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-4 w-4" /> Backup System Status
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Last Backup */}
          <div className="p-4 rounded-lg border bg-muted/40">
            <p className="text-sm text-muted-foreground mb-1">Last Backup</p>
            <p className="font-medium">5 hours ago</p>
            <Badge className="mt-2 bg-green-600">OK</Badge>
          </div>

          {/* Next Scheduled Backup */}
          <div className="p-4 rounded-lg border bg-muted/40">
            <p className="text-sm text-muted-foreground mb-1">Next Scheduled Backup</p>
            <p className="font-medium">Tonight at 2:00 AM</p>
            <Badge className="mt-2 bg-blue-600">Scheduled</Badge>
          </div>

          {/* Backup Health */}
          <div className="p-4 rounded-lg border bg-muted/40">
            <p className="text-sm text-muted-foreground mb-1">Backup Health</p>
            <p className="font-medium">Stable</p>
            <Badge className="mt-2 bg-green-600">Healthy</Badge>
          </div>

        </CardContent>
      </Card>

      {/* SECTION: BACKUP AUTOMATION */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Backup Automation Settings</CardTitle>
        </CardHeader>

        <CardContent className="space-y-8">

          {/* FREQUENCY */}
          <div className="space-y-2">
            <p className="font-medium">Backup Frequency</p>

            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="custom">Custom Schedule</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* RETENTION */}
          <div className="space-y-2">
            <p className="font-medium">Backup Retention (days)</p>

            <div className="flex items-center gap-4">
              <Slider
                value={[retention]}
                min={1}
                max={90}
                step={1}
                onValueChange={(val) => setRetention(val[0])}
                className="w-full"
              />
              <Input
                type="number"
                className="w-20"
                value={retention}
                onChange={(e) => setRetention(parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* DESTINATION */}
          <div className="space-y-2">
            <p className="font-medium">Backup Destination</p>

            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="local">Local Storage</SelectItem>
                <SelectItem value="ftp">Remote FTP Server</SelectItem>
                <SelectItem value="s3">AWS S3 / Object Storage</SelectItem>
                <SelectItem value="custom">Custom Provider</SelectItem>
              </SelectContent>
            </Select>

            {destination === "ftp" && (
              <p className="text-xs text-muted-foreground">
                FTP settings are configured under <b>System Settings → FTP</b>.
              </p>
            )}
          </div>

          {/* TEST BACKUP BUTTON */}
          <Button
            onClick={testBackup}
            className="w-[220px] bg-yellow-500 hover:bg-yellow-600 text-black"
          >
            <CloudUpload className="h-4 w-4 mr-2" />
            Test Backup Execution
          </Button>
        </CardContent>
      </Card>

      {/* SECTION: LAST 5 BACKUPS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Recent Backup History
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">

          {/* Replace with backend response */}
          {[
            { date: "Today - 2:00 AM", status: "Success" },
            { date: "Yesterday - 2:00 AM", status: "Success" },
            { date: "2 days ago", status: "Failed" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-md border"
            >
              <p className="text-sm">{item.date}</p>

              {item.status === "Success" ? (
                <Badge className="bg-green-600">Success</Badge>
              ) : (
                <Badge className="bg-red-600">Failed</Badge>
              )}
            </div>
          ))}

        </CardContent>
      </Card>
    </div>
  );
}
