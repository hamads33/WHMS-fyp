"use client";

import { useState } from "react";
import { createTask } from "@/app/automation/api";
import CronBuilder from "@/app/automation/components/cron/cron-builder";

export default function TaskForm({ profileId }: { profileId: string }) {
  const [actionType, setActionType] = useState("plugin:axios_ping:ping");
  const [url, setUrl] = useState("");
  const [cron, setCron] = useState("");

  async function save() {
    await createTask(profileId, {
      actionType,
      actionMeta: { url },
      cron
    });
    window.location.reload();
  }

  return (
    <div className="border p-4 rounded bg-gray-50">
      <h3 className="font-semibold mb-2">Create Task</h3>

      <input
        className="border p-2 rounded w-full mb-2"
        placeholder="Action Type"
        value={actionType}
        onChange={(e) => setActionType(e.target.value)}
      />

      <input
        className="border p-2 rounded w-full mb-2"
        placeholder="Action Meta URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <CronBuilder value={cron} onChange={setCron} />

      <button className="mt-3 px-3 py-1 bg-blue-500 text-white rounded" onClick={save}>
        Save Task
      </button>
    </div>
  );
}
