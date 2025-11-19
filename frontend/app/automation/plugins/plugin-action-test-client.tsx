// /frontend/app/automation/plugins/plugin-action-test-client.tsx
"use client";

import React, { useState } from "react";
import DynamicSchemaForm from "@/app/automation/components/DynamicSchemaForm";
import { JSONSchema } from "@/app/automation/components/DynamicSchemaForm/types";
import { testAction } from "@/app/automation/utils/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PluginActionTestClient({ action }: { action: any }) {
  const schema: JSONSchema = action?.jsonSchema ?? action?.schema ?? { type: "object", properties: {} };
  const [result, setResult] = useState<any | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(payload: any) {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await testAction(action.id, payload);
      setResult(res);
      toast.success("Test executed");
    } catch (err: any) {
      setError(err?.message || "Test failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <DynamicSchemaForm
        schema={schema}
        defaultValues={schema.default ?? {}}
        onSubmit={onSubmit}
        submitLabel={running ? "Running..." : "Run Test"}
      />

      <div>
        <div className="text-sm text-slate-500 mb-2">Result</div>
        <Card>
          <div className="p-3">
            {error ? (
              <pre className="text-sm text-red-600">{error}</pre>
            ) : result ? (
              <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
            ) : (
              <div className="text-sm text-slate-500">No result yet — run the test form.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
