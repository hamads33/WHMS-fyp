"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import CronBuilder from "@/app/automation/tasks/CronBuilder"; // assume you already have a CronBuilder
import * as api from "@/app/automation/utils/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface Task {
  id?: number;
  profileId?: number;
  cron: string;
  actionType: string;
  actionMeta: any;
}

interface Props {
  open: boolean;
  initialTask: Task | null;
  onClose: () => void;
}

const ACTION_TYPES = [
  "plugin:axios_ping:ping",
  "builtin:email:send",
  // add more action types or load dynamically
];

export default function TaskForm({ open, initialTask, onClose }: Props) {
  const isEdit = !!initialTask?.id;

  const [profileId, setProfileId] = useState<string>(initialTask?.profileId?.toString() ?? "");
  const [cron, setCron] = useState(initialTask?.cron ?? "*/5 * * * *");
  const [actionType, setActionType] = useState(initialTask?.actionType ?? ACTION_TYPES[0]);
  const [actionMetaText, setActionMetaText] = useState(JSON.stringify(initialTask?.actionMeta ?? { url: "https://example.com" }, null, 2));

  useEffect(() => {
    if (initialTask) {
      setProfileId(initialTask.profileId?.toString() ?? "");
      setCron(initialTask.cron);
      setActionType(initialTask.actionType);
      setActionMetaText(JSON.stringify(initialTask.actionMeta ?? { url: "https://example.com" }, null, 2));
    } else {
      setProfileId("");
      setCron("*/5 * * * *");
      setActionType(ACTION_TYPES[0]);
      setActionMetaText(JSON.stringify({ url: "https://example.com" }, null, 2));
    }
  }, [initialTask]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let meta;
    try {
      meta = JSON.parse(actionMetaText);
    } catch {
      toast.error("Invalid JSON in Action Meta");
      return;
    }

    try {
      if (isEdit && initialTask?.id) {
        await api.updateTask(initialTask.id, { cron, actionType, actionMeta: meta });
        toast.success("Task updated");
      } else {
        if (!profileId) { toast.error("Profile ID required"); return; }
        await api.createTask(Number(profileId), { cron, actionType, actionMeta: meta });
        toast.success("Task created");
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save task");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Task" : "Create Task"}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {!isEdit && (
            <div>
              <Label>Profile ID</Label>
              <Input value={profileId} onChange={(e) => setProfileId(e.target.value)} placeholder="Profile ID" required />
            </div>
          )}

          <div>
            <Label>Cron</Label>
            <CronBuilder value={cron} onChange={setCron} />
          </div>

          <div>
            <Label>Action Type</Label>
            <Select value={actionType} onValueChange={(v) => setActionType(v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Action Meta (JSON)</Label>
            <textarea
              value={actionMetaText}
              onChange={(e) => setActionMetaText(e.target.value)}
              className="w-full h-36 p-2 rounded border border-input font-mono text-sm bg-background"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="submit">{isEdit ? "Update" : "Create"}</Button>
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
