"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/**
 * SchemaForm
 * -----------------------------------------
 * Renders a form based on JSON Schema
 */
export function SchemaForm({ schema, value = {}, onChange }) {
  if (!schema?.properties) return null

  const required = schema.required || []

  const updateField = (key, fieldValue) => {
    onChange({
      ...value,
      [key]: fieldValue,
    })
  }

  return (
    <div className="space-y-4">
      {Object.entries(schema.properties).map(([key, field]) => {
        const isRequired = required.includes(key)
        const fieldValue = value[key] ?? field.default ?? ""

        return (
          <div key={key} className="space-y-1">
            <Label className="text-sm">
              {field.title || key}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>

            {/* STRING */}
            {field.type === "string" && !field.enum && (
              <Input
                value={fieldValue}
                placeholder={field.description}
                onChange={(e) => updateField(key, e.target.value)}
              />
            )}

            {/* ENUM */}
            {field.enum && (
              <Select
                value={fieldValue || field.default}
                onValueChange={(v) => updateField(key, v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  {field.enum.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* OBJECT / JSON */}
            {field.type === "object" && (
              <Textarea
                rows={4}
                placeholder="JSON object"
                value={JSON.stringify(fieldValue || {}, null, 2)}
                onChange={(e) => {
                  try {
                    updateField(key, JSON.parse(e.target.value))
                  } catch {
                    // ignore invalid JSON
                  }
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
