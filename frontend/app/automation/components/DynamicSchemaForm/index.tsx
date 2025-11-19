// DynamicSchemaForm/index.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { buildZodFromJsonSchema } from "./zod-builder";
import { FieldRenderer } from "./field-map";
import type { JSONSchema } from "./types";
import { Button } from "@/components/ui/button";
import { z } from "zod";

export default function DynamicSchemaForm({
  schema,
  defaultValues,
  onSubmit,
  submitLabel = "Save",
}: {
  schema: JSONSchema;
  defaultValues?: any;
  onSubmit: (data: any) => Promise<void> | void;
  submitLabel?: string;
}) {
  // Build Zod from schema (fallback to object)
  const zodSchema =
    buildZodFromJsonSchema(schema) ??
    z.object({}).passthrough(); // allow dynamic fields safely

  const methods = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: defaultValues ?? {},
    mode: "onSubmit",
  });

  const { handleSubmit, reset } = methods;

  const previousSchemaRef = useRef<JSONSchema | null>(null);

  useEffect(() => {
    // Reset ONLY when defaultValues is provided (edit mode)
    if (defaultValues) {
      reset(defaultValues);
      return;
    }

    // If schema changed completely, reset empty form ONCE
    if (previousSchemaRef.current !== schema) {
      previousSchemaRef.current = schema;
      reset({});
    }
  }, [schema, defaultValues, reset]);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {schema.type === "object" && schema.properties ? (
          Object.entries(schema.properties).map(([key, propSchema]) => (
            <div key={key}>
              <FieldRenderer name={key} schema={propSchema} form={methods} />
            </div>
          ))
        ) : (
          <FieldRenderer name="value" schema={schema} form={methods} />
        )}

        <div className="pt-4">
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </FormProvider>
  );
}
