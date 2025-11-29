"use client";

import React, { useEffect, useState } from "react";
import CronBuilder from "@/app/automation/components/cron/cron-builder";
import { createProfile, updateProfile, Profile } from "@/app/automation/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function ProfileForm({ initial, onSaved, onCancel }:{ initial?: Profile; onSaved?: ()=>void; onCancel?: ()=>void }) {
  const [name,setName] = useState(initial?.name ?? "");
  const [desc,setDesc] = useState(initial?.description ?? "");
  const [cron,setCron] = useState(initial?.cron ?? "*/5 * * * *");

  useEffect(()=> {
    setName(initial?.name ?? "");
    setDesc(initial?.description ?? "");
    setCron(initial?.cron ?? "*/5 * * * *");
  }, [initial]);

  const qc = useQueryClient();

  const createMut = useMutation({ mutationFn: (payload: Partial<Profile>) => createProfile(payload), onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }) });
  const updateMut = useMutation({ mutationFn: ({ id, payload } : { id: string; payload: Partial<Profile>}) => updateProfile(id, payload), onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }) });

  async function save(e?:React.FormEvent) {
    if (e) e.preventDefault();
    if (initial?.id) {
      await updateMut.mutateAsync({ id: initial.id, payload: { name, description: desc, cron } });
    } else {
      await createMut.mutateAsync({ name, description: desc, cron });
    }
    onSaved?.();
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div>
        <label className="text-xs font-medium">Name</label>
        <input className="w-full border rounded p-2" value={name} onChange={(e)=>setName(e.target.value)} required />
      </div>

      <div>
        <label className="text-xs font-medium">Description</label>
        <input className="w-full border rounded p-2" value={desc} onChange={(e)=>setDesc(e.target.value)} />
      </div>

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
