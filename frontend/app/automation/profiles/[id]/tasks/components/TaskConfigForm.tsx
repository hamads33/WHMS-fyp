"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/**
 * Convert JSON schema type → Zod schema
 */
function buildZodFromJsonSchema(jsonSchema: any): any {
  let shape: any = {};

  for (const [key, field] of Object.entries(jsonSchema.properties)) {
    let zField;

    switch (field.type) {
      case "string":
        zField = z.string();
        if (field.format === "email") zField = zField.email();
        break;

      case "number":
      case "integer":
        zField = z.number();
        break;

      case "boolean":
        zField = z.boolean();
        break;

      case "array":
        zField = z.array(z.any());
        break;

      case "object":
        zField = buildZodFromJsonSchema(field);
        break;

      default:
        zField = z.any();
    }

    if (jsonSchema.required?.includes(key)) {
      shape[key] = zField;
    } else {
      shape[key] = zField.optional();
    }
  }

  return z.object(shape);
}

/**
 * UI Renderer for each field
 */
function FieldRenderer({ fieldKey, field, register, control, watch, setValue }: any) {
  const value = watch(fieldKey);

  if (field.enum) {
    return (
      <div className="space-y-1">
        <Label>{fieldKey}</Label>
        <Select
          value={value || ""}
          onValueChange={(v) => setValue(fieldKey, v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Select ${fieldKey}`} />
          </SelectTrigger>
          <SelectContent>
            {field.enum.map((opt: string) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  switch (field.type) {
    case "string":
      return (
        <div className="space-y-1">
          <Label>{fieldKey}</Label>
          <Input {...register(fieldKey)} />
        </div>
      );

    case "number":
    case "integer":
      return (
        <div className="space-y-1">
          <Label>{fieldKey}</Label>
          <Input type="number" {...register(fieldKey, { valueAsNumber: true })} />
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={value || false}
            onCheckedChange={(v) => setValue(fieldKey, v)}
          />
          <Label>{fieldKey}</Label>
        </div>
      );

    case "object":
      return (
        <div className="border p-3 rounded space-y-2">
          <Label className="font-semibold">{fieldKey}</Label>

          {Object.entries(field.properties).map(([nestedKey, nestedField]: any) => (
            <FieldRenderer
              key={nestedKey}
              fieldKey={`${fieldKey}.${nestedKey}`}
              field={nestedField}
              register={register}
              control={control}
              watch={watch}
              setValue={setValue}
            />
          ))}
        </div>
      );

    default:
      return (
        <div className="space-y-1">
          <Label>{fieldKey}</Label>
          <Textarea {...register(fieldKey)} />
        </div>
      );
  }
}

export default function TaskConfigForm({ schema, value, onChange }: any) {
  const zodSchema = buildZodFromJsonSchema(schema);

  const form = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: value || {}
  });

  const { register, handleSubmit, control, watch, setValue } = form;

  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit((v) => onChange(v))}
    >
      {Object.entries(schema.properties).map(([key, field]: any) => (
        <FieldRenderer
          key={key}
          fieldKey={key}
          field={field}
          register={register}
          control={control}
          watch={watch}
          setValue={setValue}
        />
      ))}

      {/* Auto-save onChange */}
      <div className="hidden">
        {JSON.stringify(watch())}
      </div>
    </form>
  );
}
