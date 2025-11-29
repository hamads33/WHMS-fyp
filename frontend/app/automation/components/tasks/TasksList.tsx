"use client";

import React from "react";
import { Task } from "@/app/automation/api";

export default function TasksList({ profileId, tasks, onEdit, onDelete, onRun }:{ profileId: string; tasks: Task[]; onEdit:(t:Task)=>void; onDelete:(id:string)=>void; onRun:(id:string)=>void }) {
  return (
    <div className="space-y-2">
      {tasks.length === 0 && <div className="text-sm text-gray-500">No tasks for this profile.</div>}
      {tasks.map(t => (
        <div key={t.id} className="p-3 border rounded bg-white flex justify-between">
          <div className="flex-1">
            <div className="font-medium">{t.name}</div>
            <div className="text-xs text-gray-700">Action: <code>{t.actionType}</code></div>
            {t.actionMeta?.url && <div className="text-xs text-gray-700">URL: <code>{t.actionMeta.url}</code></div>}
            <div className="text-xs text-gray-500 mt-1">Cron: <code>{t.cron}</code></div>
          </div>

          <div className="flex flex-col gap-2 ml-4">
            <button className="px-2 py-1 text-xs bg-slate-100 rounded" onClick={()=>onEdit(t)}>Edit</button>
            <button className="px-2 py-1 text-xs bg-blue-100 rounded" onClick={()=>onRun(t.id)}>Run</button>
            <button className="px-2 py-1 text-xs bg-red-100 rounded" onClick={()=>onDelete(t.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
