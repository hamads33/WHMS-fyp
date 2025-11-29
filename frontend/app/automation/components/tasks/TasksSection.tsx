"use client";

import React, { useState } from "react";
import TasksList from "./TasksList";
import TaskModal from "../modals/TaskModal";
import TaskRunHistory from "@/app/automation/components/TaskRunHistory";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/app/automation/hooks/queries";
import { toast } from "sonner";
import { Task } from "@/app/automation/api";
import { ProfileSkeleton } from "@/app/automation/components/Skeletons";

export default function TasksSection({ profileId }:{ profileId?: string }) {
  const { data: tasks = [], isLoading } = useTasks(profileId);
  const createMut = useCreateTask(profileId);
  const updateMut = useUpdateTask(profileId);
  const deleteMut = useDeleteTask(profileId);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Task | null>(null);

  function openCreate() { setSelected(null); setOpen(true); }
  function openEdit(t: Task) { setSelected(t); setOpen(true); }

  async function handleDelete(id: string) {
    try {
      await toast.promise(deleteMut.mutateAsync(id), { loading: "Deleting task...", success: "Deleted", error: "Delete failed" });
    } catch {}
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">Tasks</h3>
        <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={openCreate} disabled={!profileId}>New</button>
      </div>

      {!profileId ? <div className="text-sm text-gray-500">Select profile to manage tasks.</div> : isLoading ? <ProfileSkeleton /> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <TasksList profileId={profileId} tasks={tasks} onEdit={openEdit} onDelete={handleDelete} onRun={async (id)=>{ await toast.promise(fetch(`${process.env.NEXT_PUBLIC_API_BASE||'http://localhost:4000'}/api/automation/tasks/${id}/run`,{ method: "POST" }), { loading:"Running...", success:"Ran", error:"Run failed" }); }} />
          </div>

          <aside className="space-y-4">
            <TaskRunHistory taskId={selected?.id ?? tasks[0]?.id} />
          </aside>
        </div>
      )}

      <TaskModal open={open} onOpenChange={setOpen} profileId={profileId ?? ""} initial={selected} onSaved={()=>{ setOpen(false); toast.success("Saved"); }} />
    </div>
  );
}
