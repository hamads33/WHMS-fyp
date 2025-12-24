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
 * Displays all available automation actions.
 *
 * Sources:
 *  - Built-in actions → backend registry
 *  - Plugin actions   → backend registry
 *
 * IMPORTANT:
 *  - No hardcoded actions
 *  - actionType is authoritative
 */

export function ActionPalette({ onSelectAction }) {
  const [builtIn, setBuiltIn] = useState([])
  const [plugins, setPlugins] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadActions() {
      try {
        const res = await AutomationAPI.listActions()
        const actions = res.data || []

        if (!mounted) return

        setBuiltIn(actions.filter(a => a.type === "builtin"))
        setPlugins(actions.filter(a => a.type === "plugin"))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadActions()
    return () => {
      mounted = false
    }
  }, [])

  const renderAction = (action) => (
    <button
      key={action.name}
      onClick={() =>
        onSelectAction({
          actionType: action.name,
          displayName: action.description || action.name,
        })
      }
      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 text-left group"
    >
      <GripHorizontal className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
      <span className="text-sm font-medium flex-1">
        {action.description || action.name}
      </span>
    </button>
  )

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Actions</CardTitle>
        <CardDescription>
          Available automation actions
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading && (
          <p className="text-sm text-muted-foreground">
            Loading actions…
          </p>
        )}

        {!loading && (
          <>
            {/* Built-in Actions */}
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Built-in
              </h3>
              <div className="space-y-2">
                {builtIn.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No built-in actions registered
                  </p>
                )}
                {builtIn.map(renderAction)}
              </div>
            </div>

            {/* Plugin Actions */}
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Plugins
              </h3>
              <div className="space-y-2">
                {plugins.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No plugin actions installed
                  </p>
                )}
                {plugins.map(renderAction)}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
