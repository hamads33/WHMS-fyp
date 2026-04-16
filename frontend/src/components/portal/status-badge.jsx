import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// B&W status styling — no colors, just semantic meaning
const STATUS_STYLES = {
  // Positive / active
  active:     'bg-accent text-accent-foreground',
  paid:       'bg-accent text-accent-foreground',
  completed:  'bg-accent text-accent-foreground',
  open:       'border-foreground/30 text-foreground',
  answered:   'border-foreground/30 text-foreground',

  // In-progress / neutral
  pending:    'bg-muted text-foreground border-border',
  processing: 'bg-muted text-foreground border-border',
  unpaid:     'bg-muted text-foreground border-border',
  medium:     'bg-muted text-foreground border-border',

  // Negative / error
  overdue:    'text-destructive border-destructive',
  high:       'text-destructive border-destructive',
  suspended:  'text-destructive border-destructive',
  failed:     'text-destructive border-destructive',
  cancelled:  'text-destructive border-destructive',

  // Verified / account state
  verified:   'border-foreground/30 text-foreground',
  unverified: 'bg-muted text-muted-foreground border-border',
  disabled:   'text-destructive border-destructive',

  // Inactive / muted
  expired:    'bg-muted text-muted-foreground border-border',
  closed:     'bg-muted text-muted-foreground border-border',
  inactive:   'bg-muted text-muted-foreground border-border',
  low:        'bg-muted text-muted-foreground border-border',
  draft:      'bg-muted text-muted-foreground border-border',
  'pending transfer': 'bg-muted text-muted-foreground border-border',
}

export function StatusBadge({ status, className }) {
  if (!status) return null
  const key = status.toLowerCase()
  const styles = STATUS_STYLES[key] ?? 'bg-muted text-muted-foreground border-border'

  return (
    <Badge
      variant="outline"
      className={cn('font-medium text-xs capitalize', styles, className)}
    >
      {status}
    </Badge>
  )
}
