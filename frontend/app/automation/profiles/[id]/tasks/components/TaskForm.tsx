"use client";

import { useEffect, useState } from "react";
import { useActions } from "@/app/automation/hooks/useActions";
import { useTasks } from "@/app/automation/hooks/useTasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";

import TaskConfigForm from "./TaskConfigForm";

export default function TaskForm({
  profileId,
  taskId,
  defaultValues,
  actionSchema,
  onSuccess
}: any) {
  const { actions } = useActions();
  const { createTask, updateTask } = useTasks();

  const [form, setForm] = useState(
    defaultValues || {
      name: "",
      actionId: "",
      order: 0,
      retries: 3,
      backoffMs: 2000,
      isActive: true,
      config: {}
    }
  );

  const [schema, setSchema] = useState(actionSchema || null);

  // Update schema when action changes
  useEffect(() => {
    if (!form.actionId) return;
    const meta = actions.find((a: any) => a.id === form.actionId);
    setSchema(meta?.jsonSchema || null);
  }, [form.actionId, actions]);

  const handleSubmit = async () => {
    const payload = {
      ...form,
      profileId,
      config: form.config || {}
    };

    if (taskId) {
      await updateTask(taskId, payload);
    } else {
      await createTask(payload);
    }

    if (onSuccess) onSuccess();
  };

  return (
    <div className="space-y-6">
      {/* Task Name */}
      <div className="space-y-1">
        <Label>Task Name</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      {/* Action Selector */}
      <div className="space-y-1">
        <Label>Action</Label>
        <Select
          value={form.actionId}
          onValueChange={(value) => setForm({ ...form, actionId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select action" />
          </SelectTrigger>
          <SelectContent>
            {actions.map((a: any) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Order */}
      <div className="space-y-1">
        <Label>Order</Label>
        <Input
          type="number"
          value={form.order}
          onChange={(e) =>
            setForm({ ...form, order: Number(e.target.value) })
          }
        />
      </div>

      {/* Retries */}
      <div className="space-y-1">
        <Label>Retries</Label>
        <Input
          type="number"
          value={form.retries}
          onChange={(e) =>
            setForm({ ...form, retries: Number(e.target.value) })
          }
        />
      </div>

      {/* Backoff */}
      <div className="space-y-1">
        <Label>Backoff (ms)</Label>
        <Input
          type="number"
          value={form.backoffMs}
          onChange={(e) =>
            setForm({ ...form, backoffMs: Number(e.target.value) })
          }
        />
      </div>

      {/* Active Toggle */}
      <div className="flex items-center gap-2">
        <Switch
          checked={form.isActive}
          onCheckedChange={(v) => setForm({ ...form, isActive: v })}
        />
        <Label>Active</Label>
      </div>

      {/* Dynamic JSON Schema Form */}
      {schema && (
        <TaskConfigForm
          schema={schema}
          value={form.config}
          onChange={(config: any) => setForm({ ...form, config })}
        />
      )}

      <Button onClick={handleSubmit} className="w-full">
        {taskId ? "Save Changes" : "Create Task"}
      </Button>
    </div>
  );
}
