"use client";

import { useState, useEffect } from "react";
import { HardDrive, FolderOpen, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { AdminBillingAPI } from "@/lib/api/billing";

export default function StoragePathsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paths, setPaths] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await AdminBillingAPI.getStoragePaths();
      setPaths(data.paths ?? data);
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to load storage paths", description: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function set(key, value) {
    setPaths((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data = await AdminBillingAPI.updateStoragePaths(paths);
      setPaths(data.paths ?? data);
      toast({ title: "Storage paths saved" });
    } catch (err) {
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !paths) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading storage paths…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-700">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
          Changing storage paths may require manual file migration if you already have files stored. Plan accordingly before updating.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-4 w-4" /> Backup Storage Path
          </CardTitle>
          <CardDescription>Directory where system backups are stored.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <Label htmlFor="backup_path">Backup Path</Label>
          <div className="flex gap-2">
            <Input
              id="backup_path"
              placeholder="/backups"
              value={paths.backupPath ?? ""}
              onChange={(e) => set("backupPath", e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="sm" disabled>
              <FolderOpen className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-4 w-4" /> Broadcast Uploads Path
          </CardTitle>
          <CardDescription>Directory for broadcast/media file uploads.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <Label htmlFor="broadcast_path">Broadcast Path</Label>
          <div className="flex gap-2">
            <Input
              id="broadcast_path"
              placeholder="/uploads/broadcasts"
              value={paths.broadcastPath ?? ""}
              onChange={(e) => set("broadcastPath", e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="sm" disabled>
              <FolderOpen className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-4 w-4" /> Plugin Uploads Path
          </CardTitle>
          <CardDescription>Directory where plugin files are stored.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <Label htmlFor="plugin_path">Plugin Path</Label>
          <div className="flex gap-2">
            <Input
              id="plugin_path"
              placeholder="/plugins"
              value={paths.pluginPath ?? ""}
              onChange={(e) => set("pluginPath", e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="sm" disabled>
              <FolderOpen className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Storage Paths
        </Button>
      </div>
    </div>
  );
}
