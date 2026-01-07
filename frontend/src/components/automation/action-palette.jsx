"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { GripHorizontal } from "lucide-react"
import { AutomationAPI } from "@/lib/api/automation"

/**
 * ActionPalette
 * ----------------------------------------------------
 * Fetches actions from backend registry
 * Groups built-in and plugin actions
 * Emits normalized action object:
 * {
 *   actionType: string,
 *   displayName: string,
 *   actionSchema: object | null
 * }
 */

export function ActionPalette({ onSelectAction }) {
  const [builtIn, setBuiltIn] = useState([])
  const [plugins, setPlugins] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    async function loadActions() {
      try {
        const res = await AutomationAPI.listActions()
        const actions = res?.data ?? []

        if (!alive) return

        setBuiltIn(actions.filter(a => a.type === "builtin"))
        setPlugins(actions.filter(a => a.type === "plugin"))
      } catch (err) {
        console.error("Failed to load actions:", err)
      } finally {
        if (alive) setLoading(false)
      }
    }

    loadActions()
    return () => { alive = false }
  }, [])

  /**
   * Render a single action button
   */
 const renderAction = (action) => {
  if (!action?.key) {
    console.error("Invalid action object:", action)
    return null
  }

  return (
    <button
      key={`${action.type}:${action.key}`}
      onClick={() =>
        onSelectAction({
          actionType: action.key,      // ✅ registry key
          displayName: action.name,    // UI label
          actionSchema: action.schema || null
        })
      }
      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 text-left group"
    >
      <GripHorizontal className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
      <span className="text-sm font-medium flex-1">
        {action.name}
      </span>
    </button>
  )
}


  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Actions</CardTitle>
        <CardDescription>Available automation actions</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading && (
          <p className="text-sm text-muted-foreground">Loading actions…</p>
        )}

        {!loading && (
          <>
            {/* Built-in */}
            <section>
              <h3 className="text-sm font-semibold mb-3">Built-in</h3>
              <div className="space-y-2">
                {builtIn.length === 0
                  ? <p className="text-xs text-muted-foreground">None</p>
                  : builtIn.map(renderAction)}
              </div>
            </section>

            {/* Plugins */}
            <section>
              <h3 className="text-sm font-semibold mb-3">Plugins</h3>
              <div className="space-y-2">
                {plugins.length === 0
                  ? <p className="text-xs text-muted-foreground">No plugins installed</p>
                  : plugins.map(renderAction)}
              </div>
            </section>
          </>
        )}
      </CardContent>
    </Card>
  )
}
