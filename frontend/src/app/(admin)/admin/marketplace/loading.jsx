import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function MarketplaceLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-80" /></div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4 text-center"><Skeleton className="h-8 w-12 mx-auto" /><Skeleton className="h-3 w-24 mx-auto mt-1" /></CardContent></Card>
        ))}
      </div>
      <Skeleton className="h-10 w-64" />
      <Card><CardContent className="p-4 divide-y divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 py-4">
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex gap-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-24" /></div>
              <Skeleton className="h-3 w-72" />
            </div>
            <div className="flex gap-2 shrink-0"><Skeleton className="h-8 w-20" /><Skeleton className="h-8 w-16" /></div>
          </div>
        ))}
      </CardContent></Card>
    </div>
  );
}
