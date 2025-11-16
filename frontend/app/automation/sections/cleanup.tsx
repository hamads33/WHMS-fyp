"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

export default function CleanupTab() {
  const [logDays, setLogDays] = useState("30");
  const [dbOpt, setDbOpt] = useState(true);
  const [cache, setCache] = useState(true);
  const [pruneBackups, setPruneBackups] = useState(true);

  const save = () => toast.success("Cleanup settings updated.");

  return (
    <div className="space-y-8">

      {/* LOG ROTATION */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Log Rotation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">Rotate logs older than (days)</p>
          <Input
            className="w-[120px]"
            value={logDays}
            onChange={(e) => setLogDays(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* DB OPT */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Database Optimization</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm font-medium">Auto Optimize Weekly</span>
          <Switch checked={dbOpt} onCheckedChange={setDbOpt} />
        </CardContent>
      </Card>

      {/* CACHE CLEANUP */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Cache Cleanup</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm font-medium">Auto Clear Cache Daily</span>
          <Switch checked={cache} onCheckedChange={setCache} />
        </CardContent>
      </Card>

      {/* BACKUP PRUNE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Prune Old Backups</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm font-medium">Auto-delete outdated backups</span>
          <Switch checked={pruneBackups} onCheckedChange={setPruneBackups} />
        </CardContent>
      </Card>

      <Button className="bg-yellow-500 text-black hover:bg-yellow-600" onClick={save}>
        Save Cleanup Settings
      </Button>
    </div>
  );
}
