"use client";

import { useState } from "react";
import SchemaViewer from "./SchemaViewer";
import TaskConfigForm from "../../profiles/[id]/components/TaskConfigForm";
import { Button } from "@/components/ui/button";
import { useActions } from "@/app/automation/hooks/useActions";
import { Card } from "@/components/ui/card";

export default function ActionTestForm({ action }: any) {
  const [config, setConfig] = useState({});
  const { testAction } = useActions();

  const runTest = async () => {
    await testAction(action.id, config);
    alert("Test executed! Check logs.");
  };

  return (
    <div className="space-y-6">
      <SchemaViewer schema={action.jsonSchema} />

      <Card className="p-4">
        <h3 className="font-semibold mb-2">Test Parameters</h3>

        <TaskConfigForm
          schema={action.jsonSchema}
          value={config}
          onChange={setConfig}
        />
      </Card>

      <Button className="w-full" onClick={runTest}>
        Run Test Action
      </Button>
    </div>
  );
}
