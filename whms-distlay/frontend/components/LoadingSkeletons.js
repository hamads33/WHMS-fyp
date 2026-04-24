import { Skeleton } from '@/components/ui/skeleton';

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-2">
      {Array(rows)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array(cols)
              .fill(0)
              .map((_, j) => (
                <Skeleton key={j} className="h-12 flex-1" />
              ))}
          </div>
        ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="border rounded-lg p-6 space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
    </div>
  );
}
