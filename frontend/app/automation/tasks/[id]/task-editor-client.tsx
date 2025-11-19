// /frontend/app/automation/tasks/[id]/task-editor-client.tsx
"use client";

import React, { useEffect, useState } from "react";
import PageHeader from "@/app/automation/components/PageHeader";
import {
  updateTask,
  runTask,
} from "@/app/automation/utils/api";
import { JSONSchema } from "@/app/automation/components/DynamicSchemaForm/types";
import DynamicSchemaForm from "@/app/automation/components/DynamicSchemaForm";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TaskEditorClient({
  task,
  actions,
}: {
  task: any;
  actions: any[];
}) {
  const [name, setName] = useState(task.name);
  const [actionId, setActionId] = useState(task.actionId);
  const [order, setOrder] = useState(task.order);
  const [schema, setSchema] = useState<JSONSchema | null>(null);

  useEffect(() => {
    const act = actions.find((a) => a.id === actionId);
    setSchema(act?.jsonSchema ?? null);
  }, [actionId, actions]);

  async function handleSave(config: any) {
    try {
      await updateTask(task.id, {
        name,
        actionId,
        order,
        config,
      });
      toast.success("Task updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  }

  async function runNow() {
    try {
      const res = await runTask(task.id);
      toast.success("Executed");
      console.log(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to execute task");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Edit Task — ${task.name}`}
        description="Modify action, data, and execution order"
      >
        <Button onClick={runNow} variant="outline">
          Run Now
        </Button>
      </PageHeader>

      <div className="bg-white p-6 rounded-lg shadow space-y-6">
        {/* Task name */}
        <div>
          <label className="text-sm font-medium">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Action */}
        <div>
          <label className="text-sm font-medium">Action</label>
          <Select value={actionId} onValueChange={setActionId}>
            <SelectTrigger>
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              {actions.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Order */}
        <div>
          <label className="text-sm font-medium">Order</label>
          <Input
            type="number"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
          />
        </div>

        {/* Config */}
        {schema && (
          <div className="border rounded-lg p-4">
            <DynamicSchemaForm
              schema={schema}
              defaultValues={task.config}
              onSubmit={handleSave}
              submitLabel="Save Changes"
            />
          </div>
        )}
      </div>
    </div>
  );
}
