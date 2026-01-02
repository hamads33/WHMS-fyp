"use client"

import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function SchemaField({
  name,
  schema,
  value,
  required,
  error,
  onChange,
}) {
  const label = schema.title || name

  // ENUM
  if (schema.enum) {
    return (
      <div className="space-y-2">
        <Label>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>

        <Select
          value={value ?? ""}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger
            className={cn(error && "border-destructive")}
          >
            <SelectValue placeholder={`Select ${label}`} />
          </SelectTrigger>

          <SelectContent>
            {schema.enum.map((opt) => (
              <SelectItem key={opt} value={String(opt)}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    )
  }

  // BOOLEAN
  if (schema.type === "boolean") {
    return (
      <div className="flex items-center gap-3">
        <Switch
          checked={Boolean(value)}
          onCheckedChange={onChange}
        />
        <Label>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      </div>
    )
  }

  // STRING / NUMBER
  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>

      <Input
        type={schema.type === "number" ? "number" : "text"}
        value={value ?? ""}
        onChange={(e) =>
          onChange(
            schema.type === "number"
              ? Number(e.target.value)
              : e.target.value
          )
        }
        className={cn(error && "border-destructive")}
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
