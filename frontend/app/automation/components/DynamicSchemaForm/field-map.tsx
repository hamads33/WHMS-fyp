// DynamicSchemaForm/field-map.tsx
"use client";

import React from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import type { JSONSchema } from "./types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

/**
 * Render a single field for given schema property
 * - name: field name
 * - schema: JSONSchema for the property
 * - form: react-hook-form instance
 */
export function FieldRenderer({
  name,
  schema,
  form,
  path = name,
}: {
  name: string;
  path?: string;
  schema: JSONSchema;
  form: UseFormReturn<any>;
}) {
  const { control, register, formState: { errors } } = form;
  const error = errors && (errors as any)[name];

  // primitives and enums
  if ((schema.type === "string" && schema.enum) || schema.enum) {
    const items = (schema.enum || []).map(String);
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium">{schema.title || name}</label>
        <Controller
          control={control}
          name={path}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value ?? ""}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {items.map((it) => (
                  <SelectItem key={it} value={it}>
                    {it}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {error && <p className="text-sm text-destructive">{(error as any).message}</p>}
      </div>
    );
  }

  if (schema.type === "string") {
    // textarea for long strings (heuristic: description or format)
    const isLarge = schema.format === "textarea" || (schema.description && schema.description.length > 120);
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium">{schema.title || name}</label>
        {isLarge ? (
          <Textarea {...register(path)} />
        ) : (
          <Input {...register(path)} />
        )}
        {error && <p className="text-sm text-destructive">{(error as any).message}</p>}
      </div>
    );
  }

  if (schema.type === "number" || schema.type === "integer") {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium">{schema.title || name}</label>
        <Input type="number" {...register(path, { valueAsNumber: true })} />
        {error && <p className="text-sm text-destructive">{(error as any).message}</p>}
      </div>
    );
  }

  if (schema.type === "boolean") {
    return (
      <div className="flex items-center gap-3">
        <Controller
          control={control}
          name={path}
          render={({ field }) => (
            <Switch checked={!!field.value} onCheckedChange={(v) => field.onChange(v)} />
          )}
        />
        <label className="text-sm font-medium">{schema.title || name}</label>
        {error && <p className="text-sm text-destructive">{(error as any).message}</p>}
      </div>
    );
  }

  // object (render nested fields)
  if (schema.type === "object" && schema.properties) {
    return (
      <div className="border rounded p-3 space-y-3">
        <div className="text-sm font-medium">{schema.title || name}</div>
        {Object.entries(schema.properties).map(([k, v]) => (
          <FieldRenderer key={k} name={k} path={`${path}.${k}`} schema={v} form={form} />
        ))}
      </div>
    );
  }

  // array (simple arrays)
  if (schema.type === "array" && schema.items) {
    // simple array editor using register + local state for count
    const values = form.getValues(path) || [];
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{schema.title || name}</div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => {
              const old = form.getValues(path) || [];
              form.setValue(path, [...old, schema.items?.default ?? null]);
            }}>Add</Button>
            <Button size="sm" variant="outline" onClick={() => {
              const old = form.getValues(path) || [];
              form.setValue(path, old.slice(0, -1));
            }}>Remove</Button>
          </div>
        </div>

        {(form.getValues(path) || []).map((_: any, idx: number) => {
          const itemPath = `${path}[${idx}]`;
          return (
            <div key={idx} className="pl-2">
              <FieldRenderer name={`${name}[${idx}]`} path={itemPath} schema={schema.items!} form={form} />
            </div>
          );
        })}
      </div>
    );
  }

  // fallback
  return (
    <div>
      <label className="text-sm font-medium">{schema.title || name}</label>
      <Input {...register(path)} />
    </div>
  );
}
