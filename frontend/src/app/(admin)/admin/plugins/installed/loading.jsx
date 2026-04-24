import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function InstalledLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2"><Skeleton className="h-8 w-52" /><Skeleton className="h-4 w-80" /></div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4 text-center"><Skeleton className="h-8 w-12 mx-auto" /><Skeleton className="h-3 w-16 mx-auto mt-1" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-4 divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-4">
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-64" /></div>
            <Skeleton className="h-6 w-10 shrink-0" />
          </div>
        ))}
      </CardContent></Card>
    </div>
  );
}
