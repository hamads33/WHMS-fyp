// /frontend/app/automation/tasks/tasks-client.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Profile, Task } from "@/app/automation/utils/types";
import { deleteTask, runTask } from "@/app/automation/utils/api";
import TaskTable from "@/app/automation/components/TaskTable";
import { TableToolbar } from "@/app/automation/components/TableToolbar";
import { DeleteDialog } from "@/app/automation/components/DeleteDialog";
import { toast } from "sonner";

export default function TasksClient({ profiles }: { profiles: Profile[] }) {
  const [tasksByProfile, setTasksByProfile] = useState<
    Record<number, Task[]>
  >({});
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function load() {
    const map: Record<number, Task[]> = {};

    for (const p of profiles) {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/automation/tasks?profileId=${p.id}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        map[p.id] = json || [];
      } catch {
        map[p.id] = [];
      }
    }

    setTasksByProfile(map);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-10">
      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search tasks..."
      />

      {profiles.map((p) => (
        <TaskTable
          key={p.id}
          profile={p}
          tasks={tasksByProfile[p.id] || []}
          search={search}
          onDelete={setDeleteId}
          onRun={async (id) => {
            const res = await runTask(id);
            toast.success("Task executed");
            console.log("Run result:", res);
          }}
        />
      ))}

      {/* Delete Confirmation */}
      <DeleteDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Task"
        onConfirm={async () => {
          if (!deleteId) return;
          await deleteTask(deleteId);
          toast.success("Task deleted");
          setDeleteId(null);
          await load();
        }}
      />
    </div>
  );
}
