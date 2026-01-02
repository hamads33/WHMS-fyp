// src/components/schema/schema-utils.js

export function isRequired(schema, field) {
  return schema.required?.includes(field)
}

export function getDefaultValue(fieldSchema) {
  if (fieldSchema.default !== undefined) return fieldSchema.default

  switch (fieldSchema.type) {
    case "string":
      return ""
    case "number":
      return ""
    case "boolean":
      return false
    default:
      return null
  }
}
