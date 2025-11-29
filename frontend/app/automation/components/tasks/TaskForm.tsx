"use client";

import React, { useEffect, useState } from "react";
import CronBuilder from "@/app/automation/components/cron/cron-builder";
import PluginDynamicForm from "@/app/automation/components/PluginDynamicForm";
import { createTask, updateTask, Task } from "@/app/automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function TaskForm({ profileId, initial, onSaved, onCancel }:{ profileId: string; initial?: Task; onSaved?: ()=>void; onCancel?: ()=>void }) {
  const [name,setName] = useState(initial?.name ?? "");
  const [actionType,setActionType] = useState(initial?.actionType ?? "");
  const [actionMeta,setActionMeta] = useState<Record<string, any>>(initial?.actionMeta ?? {});
  const [cron,setCron] = useState(initial?.cron ?? "*/5 * * * *");

  useEffect(()=> {
    setName(initial?.name ?? "");
    setActionType(initial?.actionType ?? "");
    setActionMeta(initial?.actionMeta ?? {});
    setCron(initial?.cron ?? "*/5 * * * *");
  }, [initial]);

  const qc = useQueryClient();
  const createMut = useMutation({ mutationFn: (payload: Partial<Task>) => createTask(profileId, payload), onSuccess: ()=> qc.invalidateQueries({ queryKey: ["tasks", profileId] }) });
  const updateMut = useMutation({ mutationFn: ({id,payload}:{id:string; payload:Partial<Task>}) => updateTask(id,payload), onSuccess: ()=> qc.invalidateQueries({ queryKey: ["tasks", profileId] }) });

  async function save(e?:React.FormEvent) {
    if (e) e.preventDefault();
    const payload = { name, actionType, actionMeta, cron };
    if (initial?.id) {
      await updateMut.mutateAsync({ id: initial.id, payload: payload as Partial<Task> });
    } else {
      await createMut.mutateAsync(payload as Partial<Task>);
    }
    onSaved?.();
  }

  const pluginMatch = actionType?.startsWith("plugin:") ? actionType.split(":")[1] : null;

  return (
    <form onSubmit={save} className="space-y-3">
      <div>
        <label className="text-xs font-medium">Name</label>
        <input className="w-full border rounded p-2" value={name} onChange={(e)=>setName(e.target.value)} required />
      </div>

      <div>
        <label className="text-xs font-medium">Action Type</label>
        <input className="w-full border rounded p-2" value={actionType} onChange={(e)=>setActionType(e.target.value)} placeholder="plugin:axios_ping:ping" />
        <div className="text-xs text-gray-500 mt-1">Tip: plugin actions format is <code>plugin:PLUGIN_ID:action</code></div>
      </div>

      {pluginMatch && <div>
        <label className="text-xs font-medium">Action Config</label>
        <PluginDynamicForm pluginId={pluginMatch} value={actionMeta} onChange={setActionMeta} />
      </div>}

      <div>
        <label className="text-xs font-medium">Schedule</label>
        <CronBuilder initialCron={cron} onChange={(c)=>setCron(c)} />
      </div>

      <div className="flex gap-2">
        <button className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
        <button type="button" className="px-3 py-1 bg-gray-200 rounded" onClick={()=>onCancel?.()}>Cancel</button>
      </div>
    </form>
  );
}
