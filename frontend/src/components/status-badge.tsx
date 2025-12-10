import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  variant?: "default" | "success" | "warning" | "error" | "info"
}

const statusVariants: Record<string, StatusBadgeProps["variant"]> = {
  active: "success",
  completed: "success",
  enabled: "success",
  online: "success",
  suspended: "error",
  failed: "error",
  failing: "error",
  revoked: "error",
  critical: "error",
  inactive: "warning",
  paused: "warning",
  expiring: "warning",
  warning: "warning",
  pending: "info",
  scheduled: "info",
  "in-progress": "info",
  info: "info",
}

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const resolvedVariant = variant || statusVariants[status.toLowerCase()] || "default"

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
