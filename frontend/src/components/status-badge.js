"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * Maps backend status strings to UI visual variants.
 * Integrated with statuses from ipAccess.service.js and user.service.js
 */
const statusVariants = {
  // Success states
  active: "success",
  completed: "success",
  enabled: "success",
  online: "success",
  
  // Error/Danger states
  suspended: "error",
  failed: "error",
  failing: "error",
  revoked: "error", // Matches ApiKeyService.revokeKey logic
  critical: "error",
  
  // Warning states
  inactive: "warning",
  paused: "warning",
  expiring: "warning",
  warning: "warning",
  
  // Info/Neutral states
  pending: "info",
  scheduled: "info",
  "in-progress": "info",
  info: "info",
}

/**
 * StatusBadge Component
 * Displays a color-coded badge based on the provided status string.
 */
export function StatusBadge({ status, variant }) {
  const resolvedVariant = variant || statusVariants[status?.toLowerCase()] || "default"

  return (
    <Badge
      className={cn(
        "capitalize font-medium",
        resolvedVariant === "success" && "bg-success/20 text-success border-success/30",
        resolvedVariant === "error" && "bg-destructive/20 text-destructive border-destructive/30",
        resolvedVariant === "warning" && "bg-warning/20 text-warning border-warning/30",
        resolvedVariant === "info" && "bg-primary/20 text-primary border-primary/30",
        resolvedVariant === "default" && "bg-muted text-muted-foreground",
      )}
      variant="outline"
    >
      {status}
    </Badge>
  )
}