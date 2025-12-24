"use client"

import { useMemo, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function TaskConfigDrawer({
  task,
  isOpen,
  onClose,
  onSave,
}) {
  /* --------------------------------------------------
     Derive stable task id (hooks must be unconditional)
  -------------------------------------------------- */
  const taskId = task?.id ?? "__none__"

  /* --------------------------------------------------
     Derive initial JSON safely
  -------------------------------------------------- */
  const initialJson = useMemo(() => {
    if (!task) return ""
    try {
      return JSON.stringify(task.actionMeta ?? {}, null, 2)
    } catch {
      return "{}"
    }
  }, [taskId])

  /* --------------------------------------------------
     Local editable state
  -------------------------------------------------- */
  const [metaText, setMetaText] = useState(initialJson)
  const [error, setError] = useState(null)

  /* --------------------------------------------------
     Save handler
  -------------------------------------------------- */
  const handleSave = () => {
    try {
      const parsed = JSON.parse(metaText)
      onSave(task.id, parsed)
      onClose()
    } catch (err) {
      setError("Invalid JSON: " + err.message)
    }
  }

  /* --------------------------------------------------
     Guard render AFTER hooks
  -------------------------------------------------- */
  if (!task) return null

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
    >
      {/* Force remount when task changes */}
      <SheetContent
        key={taskId}
        side="right"
        className="w-full sm:w-[420px]"
      >
        <SheetHeader>
          <SheetTitle>Configure Task</SheetTitle>
          <SheetDescription>
            Edit automation task configuration
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Action Type */}
          <div>
            <Label className="text-sm font-medium">Action Type</Label>
            <div className="mt-1 rounded-md bg-muted px-3 py-2 text-xs font-mono">
              {task.actionType}
            </div>
          </div>

          {/* JSON Metadata */}
          <div>
            <Label className="text-sm font-medium">
              Action Metadata (JSON)
            </Label>
            <Textarea
              value={metaText}
              onChange={(e) => {
                setMetaText(e.target.value)
                setError(null)
              }}
              rows={12}
              className="mt-1 font-mono text-xs"
              placeholder='{"key": "value"}'
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
