// DynamicSchemaForm/zod-builder.ts
import { z } from "zod";
import type { JSONSchema } from "./types";

/**
 * Build a zod schema from a (subset) JSON Schema (Draft-07 style).
 * Supports: string (format: email), number, boolean, enum, object, array (simple)
 */
export function buildZodFromJsonSchema(schema?: JSONSchema): z.ZodTypeAny {
  if (!schema) return z.any();

  const { type } = schema;

  if (schema.enum && Array.isArray(schema.enum)) {
    // enums to union of literals -> z.enum only supports string[], so fallback to union
    const enums = schema.enum;
    if (enums.every((e) => typeof e === "string")) {
      return z.enum(enums as string[]);
    } else {
      // mixed types -> union of literals
      const lits = enums.map((v) => z.literal(v as any));
      return z.union(lits as [z.ZodLiteral<any>, ...z.ZodLiteral<any>[]]);
    }
  }

  switch (type) {
    case "string": {
      let s = z.string();
      if (schema.format === "email") s = s.email();
      if (typeof schema.minLength === "number") s = s.min(schema.minLength);
      if (typeof schema.maxLength === "number") s = s.max(schema.maxLength);
      return s;
    }

    case "number":
    case "integer": {
      let n = z.number();
      if (typeof schema.minimum === "number") n = n.min(schema.minimum);
      if (typeof schema.maximum === "number") n = n.max(schema.maximum);
      return n;
    }

    case "boolean":
      return z.boolean();

    case "array": {
      // only simple arrays supported: items may be primitive or object
      const itemSchema = buildZodFromJsonSchema(schema.items || { type: "string" });
      return z.array(itemSchema);
    }

    case "object": {
      const props = schema.properties || {};
      const required = new Set(schema.required || []);

      const shape: Record<string, z.ZodTypeAny> = {};
      for (const [key, propSchema] of Object.entries(props)) {
        let zodProp = buildZodFromJsonSchema(propSchema);
        if (!required.has(key)) {
          zodProp = zodProp.optional();
        }
        shape[key] = zodProp;
      }
      return z.object(shape);
    }

    default:
      return z.any();
  }
}
