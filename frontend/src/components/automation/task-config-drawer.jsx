"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SchemaForm } from "@/components/schema/schema-form"

export function TaskConfigDrawer({ task, isOpen, onClose, onSave }) {
  const hasSchema =
    task?.actionSchema &&
    task.actionSchema.type === "object"

  const initialMeta = useMemo(
    () => task?.actionMeta ?? {},
    [task?.id]
  )

  const [meta, setMeta] = useState(initialMeta)
  const [rawJson, setRawJson] = useState("")
  const [error, setError] = useState(null)
  const [advanced, setAdvanced] = useState(false)

  useEffect(() => {
    setMeta(initialMeta)
  }, [initialMeta])

  useEffect(() => {
    try {
      setRawJson(JSON.stringify(meta, null, 2))
    } catch {}
  }, [meta])

  if (!task) return null

  const handleSave = () => {
    try {
      onSave(task.id, meta)
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[420px]">
        {/* 🔑 key goes HERE */}
        <div key={task.id}>
          <SheetHeader>
            <SheetTitle>{task.displayName}</SheetTitle>
            <SheetDescription>Configure step settings</SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-6">
            {hasSchema && !advanced ? (
              <SchemaForm
                schema={task.actionSchema}
                value={meta}
                onChange={setMeta}
              />
            ) : (
              <Textarea
                rows={14}
                className="font-mono text-xs"
                value={rawJson}
                onChange={(e) => {
                  setRawJson(e.target.value)
                  try {
                    setMeta(JSON.parse(e.target.value))
                    setError(null)
                  } catch {
                    setError("Invalid JSON")
                  }
                }}
              />
            )}

            {hasSchema && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAdvanced(!advanced)}
              >
                {advanced ? "Use Form View" : "Advanced (JSON)"}
              </Button>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}
