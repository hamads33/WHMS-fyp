"use client";

import React from "react";
import { Profile } from "@/app/automation/api";

export default function ProfilesList({
  profiles,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onEnable,
  onDisable
}:{ profiles: Profile[]; selectedId: string | null; onSelect: (id:string)=>void; onEdit: (p:Profile)=>void; onDelete: (id:string)=>void; onEnable:(id:string)=>void; onDisable:(id:string)=>void }) {
  return (
    <div className="space-y-2">
      {profiles.length === 0 && <div className="text-sm text-gray-500">No profiles yet.</div>}
      {profiles.map(p => (
        <div key={p.id} className={`p-3 border rounded flex justify-between items-start ${selectedId===p.id ? "bg-blue-50" : "bg-white"}`}>
          <div className="cursor-pointer flex-1" onClick={()=>onSelect(p.id)}>
            <div className="font-medium">{p.name}</div>
            <div className="text-xs text-gray-600">{p.description}</div>
            <div className="text-xs text-gray-500 mt-1">Cron: <code>{p.cron}</code></div>
          </div>

          <div className="flex flex-col gap-2 ml-4">
            <button className="px-2 py-1 text-xs bg-slate-100 rounded" onClick={()=>onEdit(p)}>Edit</button>
            {p.enabled ? (
              <button className="px-2 py-1 text-xs bg-yellow-100 rounded" onClick={()=>onDisable(p.id)}>Disable</button>
            ) : (
              <button className="px-2 py-1 text-xs bg-green-100 rounded" onClick={()=>onEnable(p.id)}>Enable</button>
            )}
            <button className="px-2 py-1 text-xs bg-red-100 rounded" onClick={()=>onDelete(p.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
