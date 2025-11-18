"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import cronstrue from "cronstrue";

export default function CronPreview({ cron }: { cron: string }) {
  let readable = "";
  try {
    readable = cronstrue.toString(cron);
  } catch {
    readable = "Invalid cron expression";
  }

  return (
    <Card className="bg-muted/30">
      <CardHeader>
        <CardTitle className="text-sm">Cron Preview</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {readable}
      </CardContent>
    </Card>
  );
}
