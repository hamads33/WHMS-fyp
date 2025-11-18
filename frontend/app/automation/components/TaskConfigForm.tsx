// app/automation/components/TaskConfigForm.tsx
'use client';
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

/**
 * Lightweight JSON-schema form renderer.
 * Supports: string, number, boolean, enum, object (nested)
 */
export default function TaskConfigForm({ schema = { type: 'object', properties: {} }, value = {}, onChange }: any) {
  const properties = schema.properties || {};

  const handleChange = (key: string, val: any) => {
    onChange({ ...value, [key]: val });
  };

  const renderField = (key: string, prop: any) => {
    const val = value?.[key];
    const title = prop.title || key;
    if (prop.enum) {
      return (
        <div key={key} className="space-y-1">
          <label className="text-sm font-medium">{title}</label>
          <select value={val ?? ''} onChange={e => handleChange(key, e.target.value)} className="p-2 border rounded w-full">
            <option value="">Select</option>
            {prop.enum.map((o: any) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    }

    if (prop.type === 'string') {
      if (prop.format === 'textarea' || prop.maxLength && prop.maxLength > 200) {
        return (
          <div key={key} className="space-y-1">
            <label className="text-sm font-medium">{title}</label>
            <Textarea value={val ?? ''} onChange={(e: any) => handleChange(key, e.target.value)} />
          </div>
        );
      }
      return (
        <div key={key} className="space-y-1">
          <label className="text-sm font-medium">{title}</label>
          <Input value={val ?? ''} onChange={(e: any) => handleChange(key, e.target.value)} />
        </div>
      );
    }

    if (prop.type === 'number' || prop.type === 'integer') {
      return (
        <div key={key} className="space-y-1">
          <label className="text-sm font-medium">{title}</label>
          <Input type="number" value={val ?? ''} onChange={(e: any) => handleChange(key, e.target.value === '' ? '' : Number(e.target.value))} />
        </div>
      );
    }

    if (prop.type === 'boolean') {
      return (
        <div key={key} className="flex items-center gap-2">
          <Checkbox checked={!!val} onCheckedChange={(v: any) => handleChange(key, !!v)} />
          <label className="text-sm">{title}</label>
        </div>
      );
    }

    if (prop.type === 'object') {
      return (
        <div key={key} className="p-2 border rounded-md">
          <div className="font-medium mb-2">{title}</div>
          <TaskConfigForm schema={prop} value={val ?? {}} onChange={(v: any) => handleChange(key, v)} />
        </div>
      );
    }

    return <div key={key}>Unsupported field {key}</div>;
  };

  return (
    <div className="space-y-4">
      {Object.entries(properties).map(([k, p]) => renderField(k, p))}
    </div>
  );
}
