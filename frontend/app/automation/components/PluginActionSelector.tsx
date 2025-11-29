// frontend/app/automation/components/PluginActionSelector.tsx
"use client";

import React, { useEffect, useState } from "react";
import { listBuiltInActions, listPlugins, listPluginActions } from "@/app/automation/api";

export default function PluginActionSelector({ value, onChange }:{ value?: string; onChange: (v:string)=>void }) {
  const [built, setBuilt] = useState<string[]>([]);
  const [plugins, setPlugins] = useState<any[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<string|null>(null);
  const [pluginActions, setPluginActions] = useState<string[]>([]);

  useEffect(()=> {
    listBuiltInActions().then(r => r.success && setBuilt(r.data ?? []));
    listPlugins().then(r => r.success && setPlugins(r.data ?? []));
  }, []);

  useEffect(()=> {
    if (!selectedPlugin) { setPluginActions([]); return; }
    listPluginActions(selectedPlugin).then(r => r.success && setPluginActions(r.data ?? []));
  }, [selectedPlugin]);

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs">Built-in</label>
        <select className="w-full border rounded p-2" onChange={e => onChange(e.target.value)} value={built.includes(value ?? "") ? value : ""}>
          <option value="">Choose built-in</option>
          {built.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs">Plugin</label>
        <select className="w-full border rounded p-2" onChange={e => setSelectedPlugin(e.target.value)} value={selectedPlugin ?? ""}>
          <option value="">Choose plugin</option>
          {plugins.map(p => <option key={p.id} value={p.id}>{p.name ?? p.id}</option>)}
        </select>
      </div>

      {selectedPlugin && (
        <div>
          <label className="text-xs">Plugin actions</label>
          <select className="w-full border rounded p-2" onChange={e => onChange(`plugin:${selectedPlugin}:${e.target.value}`)} value={value?.startsWith(`plugin:${selectedPlugin}:`) ? value.split(":").slice(2).join(":") : ""}>
            <option value="">Select action</option>
            {pluginActions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
