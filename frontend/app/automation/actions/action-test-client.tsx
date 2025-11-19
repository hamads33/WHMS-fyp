// /frontend/app/automation/actions/action-test-client.tsx
"use client";

import React, { useState } from "react";
import DynamicSchemaForm from "@/app/automation/components/DynamicSchemaForm";
import { JSONSchema } from "@/app/automation/components/DynamicSchemaForm/types";
import { testAction } from "@/app/automation/utils/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function ActionTestClient({ action }: { action: any }) {
  const schema: JSONSchema = action.jsonSchema ?? action.schema ?? { type: "object", properties: {} };
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTest(config: any) {
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await testAction(action.id, config);
      setResult(res);
      toast.success("Test executed");
    } catch (err: any) {
      setError(err?.message ?? "Failed to run action");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <DynamicSchemaForm
          schema={schema}
          defaultValues={schema.default ?? {}}
          onSubmit={handleTest}
          submitLabel={running ? "Running…" : "Run Test"}
        />
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Result</h4>
        {error ? (
          <Card className="border border-red-200 p-3">
            <pre className="text-sm text-red-700">{error}</pre>
          </Card>
        ) : result ? (
          <Card className="border p-3">
            <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
          </Card>
        ) : (
          <div className="text-sm text-slate-500">No result yet — submit the form to test.</div>
        )}
      </div>
    </div>
  );
}
