"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ActionInfo({ action }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{action.name}</CardTitle>
      </CardHeader>

      <CardContent className="text-sm space-y-3">
        <p>{action.description}</p>

        <div className="text-xs text-muted-foreground">
          Version: <span className="font-mono">{action.version}</span>
        </div>

        <div className="pt-3">
          <strong>Action ID:</strong> {action.id}
        </div>
      </CardContent>
    </Card>
  );
}
