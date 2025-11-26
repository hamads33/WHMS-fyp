"use client";

import { useEffect, useState } from "react";
import { listTasks, runTask, deleteTask, Task } from "@/app/automation/api";

export default function TasksList({ profileId }: { profileId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);

  async function load() {
    const res = await listTasks(profileId);
    if (res.success) setTasks(res.data);
  }

  useEffect(() => {
    load();
  }, [profileId]);

  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <div key={t.id} className="p-3 border rounded bg-gray-50">
          <div className="font-semibold">{t.name}</div>
          <div className="text-sm">{t.actionType}</div>
          <div className="text-gray-500 text-xs">cron: {t.cron}</div>

          <div className="flex gap-2 mt-2">
            <button
              className="text-xs bg-green-200 px-2 py-1 rounded"
              onClick={() => runTask(t.id)}
            >
              Run
            </button>

            <button
              className="text-xs bg-red-200 px-2 py-1 rounded"
              onClick={async () => {
                await deleteTask(t.id);
                load();
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
