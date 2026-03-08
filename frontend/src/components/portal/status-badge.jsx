import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusConfig = {
  Active: 'bg-foreground/10 text-foreground border-foreground/20',
  Suspended: 'bg-muted text-muted-foreground border-border',
  Expired: 'bg-muted text-muted-foreground border-border',
  Paid: 'bg-foreground/10 text-foreground border-foreground/20',
  Unpaid: 'bg-muted text-muted-foreground border-border',
  Overdue: 'bg-destructive/10 text-destructive border-destructive/20',
  Open: 'bg-foreground/10 text-foreground border-foreground/20',
  Answered: 'bg-muted text-muted-foreground border-border',
  Closed: 'bg-muted text-muted-foreground border-border',
  'Pending Transfer': 'bg-muted text-muted-foreground border-border',
  Completed: 'bg-foreground/10 text-foreground border-foreground/20',
  High: 'bg-destructive/10 text-destructive border-destructive/20',
  Medium: 'bg-muted text-muted-foreground border-border',
  Low: 'bg-muted text-muted-foreground border-border',
}

export function StatusBadge({ status, className }) {
  return (
    <Badge
      variant="outline"
      className={cn('font-medium text-xs', statusConfig[status] ?? '', className)}
    >
      {status}
    </Badge>
  )
}
