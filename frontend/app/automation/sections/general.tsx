"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function GeneralTab() {
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const [timezone, setTimezone] = useState("UTC");
  const [retryAttempts, setRetryAttempts] = useState("3");
  const [retryDelay, setRetryDelay] = useState("10");
  const [nightMode, setNightMode] = useState(false);
  const [errorEmail, setErrorEmail] = useState("");

  const saveSettings = () => {
    toast.success("General automation settings updated.");
  };

  return (
    <div className="space-y-8">

      {/* SECTION: GLOBAL AUTOMATION */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Automation System</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          {/* Enable/Disable automation */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Enable Automation Engine</span>
            <Switch
              checked={automationEnabled}
              onCheckedChange={setAutomationEnabled}
            />
          </div>

          {!automationEnabled && (
            <p className="text-sm text-red-600">
              Automation engine is disabled — no scheduled tasks will run.
            </p>
          )}
        </CardContent>
      </Card>

      {/* SECTION: TIMEZONE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Automation Timezone</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">
          <p className="text-sm">Select the timezone used for all scheduled tasks.</p>

          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>

            <SelectContent className="max-h-[300px] overflow-y-auto">
              <SelectItem value="UTC">UTC</SelectItem>
              <SelectItem value="Asia/Karachi">Asia/Karachi</SelectItem>
              <SelectItem value="Asia/Dubai">Asia/Dubai</SelectItem>
              <SelectItem value="Europe/London">Europe/London</SelectItem>
              <SelectItem value="US/Eastern">US/Eastern</SelectItem>
              <SelectItem value="US/Central">US/Central</SelectItem>
              <SelectItem value="US/Pacific">US/Pacific</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* SECTION: RETRY POLICY */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Retry Policy</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">

          {/* Retry attempts */}
          <div>
            <p className="text-sm font-medium">Max Retry Attempts</p>
            <Input
              className="mt-2 w-[120px]"
              value={retryAttempts}
              onChange={(e) => setRetryAttempts(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Number of times a failed automation task will be retried.
            </p>
          </div>

          {/* Retry delay */}
          <div>
            <p className="text-sm font-medium">Retry Delay (minutes)</p>
            <Input
              className="mt-2 w-[120px]"
              value={retryDelay}
              onChange={(e) => setRetryDelay(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Delay between retry attempts.
            </p>
          </div>

        </CardContent>
      </Card>

      {/* SECTION: EXECUTION WINDOW */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Execution Window</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Run Automations Only at Night</span>
            <Switch
              checked={nightMode}
              onCheckedChange={setNightMode}
            />
          </div>

          {nightMode && (
            <p className="text-sm text-muted-foreground">
              Automations will be executed between <b>12:00 AM — 6:00 AM</b>.
            </p>
          )}
        </CardContent>
      </Card>

      {/* SECTION: ERROR REPORTING */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Error Reporting</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">
          <p className="text-sm">Send automation failure notifications to:</p>

          <Input
            className="w-[300px]"
            placeholder="admin@example.com"
            value={errorEmail}
            onChange={(e) => setErrorEmail(e.target.value)}
          />

          <p className="text-xs text-muted-foreground">
            Leave blank to disable error email alerts.
          </p>
        </CardContent>
      </Card>

      <Button
        className="bg-yellow-500 text-black hover:bg-yellow-600"
        onClick={saveSettings}
      >
        Save General Settings
      </Button>
    </div>
  );
}
