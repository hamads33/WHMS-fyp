"use client"

import { SchemaField } from "./schema-field"
import { isRequired, getDefaultValue } from "./schema-utils"

export function SchemaForm({
  schema,
  value,
  onChange,
  errors = {},
}) {
  if (!schema || schema.type !== "object") return null

  return (
    <div className="space-y-5">
      {Object.entries(schema.properties || {}).map(
        ([field, fieldSchema]) => (
          <SchemaField
            key={field}
            name={field}
            schema={fieldSchema}
            value={value[field]}
            required={isRequired(schema, field)}
            error={errors[field]}
            onChange={(v) =>
              onChange({
                ...value,
                [field]: v,
              })
            }
          />
        )
      )}
    </div>
  )
}
