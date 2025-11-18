"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Code } from "lucide-react";

export default function SchemaViewer({ schema }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Code className="w-5 h-5" />
        <CardTitle>Action Schema</CardTitle>
      </CardHeader>

      <CardContent>
        <pre className="bg-muted p-4 rounded text-xs overflow-auto">
{JSON.stringify(schema, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
