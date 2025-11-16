"use client";

import { useState } from "react";
import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function NotificationsTab() {
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [slack, setSlack] = useState("");
  const [discord, setDiscord] = useState("");
  const [webhook, setWebhook] = useState("");

  const sendTest = () => {
    toast.success("Test notification sent!");
  };

  return (
    <div className="space-y-8">

      {/* EMAIL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Email Notifications</CardTitle>
        </CardHeader>

        <CardContent className="flex items-center justify-between">
          <span className="text-sm font-medium">Enable Email Alerts</span>
          <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
        </CardContent>
      </Card>

      {/* SLACK */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Slack Webhook</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">
          <Input
            placeholder="https://hooks.slack.com/services/xxx"
            value={slack}
            onChange={(e) => setSlack(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* DISCORD */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Discord Webhook</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">
          <Input
            placeholder="https://discord.com/api/webhooks/xxx"
            value={discord}
            onChange={(e) => setDiscord(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* WEBHOOK */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Custom Webhook</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">
          <Input
            placeholder="https://yourapi.com/webhook"
            value={webhook}
            onChange={(e) => setWebhook(e.target.value)}
          />
        </CardContent>
      </Card>

      <Button onClick={sendTest} className="bg-yellow-500 text-black hover:bg-yellow-600">
        Send Test Notification
      </Button>
    </div>
  );
}
