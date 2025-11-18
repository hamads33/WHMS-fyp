"use client";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

export default function RunLogViewer({ run }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution Log</CardTitle>
      </CardHeader>

      <CardContent>
        {run.log ? (
          <pre className="bg-muted p-4 rounded text-xs overflow-auto">
{JSON.stringify(run.log, null, 2)}
          </pre>
        ) : (
          <div className="text-sm text-muted-foreground">
            No log data available.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
