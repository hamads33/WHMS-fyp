// DynamicSchemaForm/types.ts
export type JSONSchema = {
  title?: string;
  description?: string;
  type?: "object" | "array" | "string" | "number" | "boolean" | "integer";
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: Array<string | number>;
  format?: string;
  default?: any;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
};
