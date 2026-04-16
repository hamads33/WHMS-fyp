import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2"><Skeleton className="h-8 w-40" /><Skeleton className="h-4 w-72" /></div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-[220px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
