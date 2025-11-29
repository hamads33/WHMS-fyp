"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TaskForm from "../tasks/TaskForm";
import { Task } from "@/app/automation/api";

export default function TaskModal({ open, onOpenChange, profileId, initial, onSaved }:{ open:boolean; onOpenChange:(b:boolean)=>void; profileId: string; initial?: Task | null; onSaved?:()=>void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Task" : "Create Task"}</DialogTitle>
        </DialogHeader>

        <TaskForm profileId={profileId} initial={initial ?? undefined} onSaved={() => { onSaved?.(); onOpenChange(false); }} onCancel={() => onOpenChange(false)} />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
