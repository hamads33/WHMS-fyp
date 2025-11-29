"use client";

import React, { useEffect, useState } from "react";
import { getPluginManifest } from "@/app/automation/api";

type Field =
  | { name: string; label: string; type: "string" | "number" | "boolean" | "select" | "date"; placeholder?: string; required?: boolean; options?: string[]; default?: any };

export default function PluginDynamicForm({ pluginId, value, onChange }:{ pluginId: string; value?: Record<string, any>; onChange: (meta: any)=>void }) {
  const [schema, setSchema] = useState<Field[]|null>(null);
  const [form, setForm] = useState<Record<string, any>>(value ?? {});

  useEffect(() => {
    if (!pluginId) return;
    getPluginManifest(pluginId).then(res => {
      if (res.success && res.data?.configSchema) {
        setSchema(res.data.configSchema as Field[]);
        const initial = (res.data.configSchema as Field[]).reduce((acc, f) => { acc[f.name] = value?.[f.name] ?? f.default ?? (f.type === "boolean" ? false : ""); return acc; }, {} as Record<string, any>);
        setForm(initial);
        onChange(initial);
      } else {
        setSchema([]);
      }
    });
  }, [pluginId]);

  function update(name:string, v:any) {
    const next = { ...form, [name]: v };
    setForm(next);
    onChange(next);
  }

  if (schema === null) return <div className="text-sm text-gray-500">Loading config...</div>;
  if (schema.length === 0) return <div className="text-xs text-gray-500">No configuration required.</div>;

  return (
    <div className="space-y-3">
      {schema.map(f => (
        <div key={f.name}>
          <label className="text-xs font-medium">{f.label}{f.required ? " *" : ""}</label>
          {f.type === "string" && <input className="w-full border rounded p-2" placeholder={f.placeholder} value={form[f.name] ?? ""} onChange={e=>update(f.name, e.target.value)} />}
          {f.type === "number" && <input type="number" className="w-full border rounded p-2" value={form[f.name] ?? ""} onChange={e=>update(f.name, Number(e.target.value))} />}
          {f.type === "boolean" && <div><input type="checkbox" checked={Boolean(form[f.name])} onChange={e=>update(f.name, e.target.checked)} /> <span className="ml-2">{f.label}</span></div>}
          {f.type === "select" && <select className="w-full border rounded p-2" value={form[f.name]} onChange={e=>update(f.name, e.target.value)}>{f.options?.map(o => <option key={o} value={o}>{o}</option>)}</select>}
          {f.type === "date" && <input type="date" className="w-full border rounded p-2" value={form[f.name] ?? ""} onChange={e=>update(f.name, e.target.value)} />}
        </div>
      ))}
    </div>
  );
}
