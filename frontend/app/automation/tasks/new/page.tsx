// /frontend/app/automation/tasks/new/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/app/automation/components/PageHeader";
import {
  getProfiles,
  listActions,
  createTask,
} from "@/app/automation/utils/api";
import DynamicSchemaForm from "@/app/automation/components/DynamicSchemaForm";
import { JSONSchema } from "@/app/automation/components/DynamicSchemaForm/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function NewTaskPage() {
  const router = useRouter();
  const query = useSearchParams();

  const defaultProfile = query.get("profileId") || "";

  const [profiles, setProfiles] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [schema, setSchema] = useState<JSONSchema | null>(null);

  const [profileId, setProfileId] = useState<string>(defaultProfile);
  const [name, setName] = useState("");
  const [order, setOrder] = useState("1");

  const [saving, setSaving] = useState(false);

  // Load profiles + actions
  useEffect(() => {
    getProfiles().then(setProfiles);
    listActions().then((acts) => {
      setActions(acts || []);
    });
  }, []);

  // Update schema when action changes
  useEffect(() => {
    if (!selectedAction) {
      setSchema(null);
      return;
    }

    const act = actions.find((a) => a.id === selectedAction);

    // Debugging logs — remove later if you want
    // This shows exactly what the backend returned for the selected action
    // so you can confirm whether the schema is under `jsonSchema` or `schema`.
    // Open browser console and watch the object when you choose an action.
    // eslint-disable-next-line no-console
    console.debug("Selected action object:", act);

    // Accept either `jsonSchema` (preferred) or `schema` (common alternative)
    const resolvedSchema: JSONSchema | null =
      (act?.jsonSchema as JSONSchema) ?? (act?.schema as JSONSchema) ?? null;

    // eslint-disable-next-line no-console
    console.debug("Resolved schema (jsonSchema || schema):", resolvedSchema);

    setSchema(resolvedSchema);
  }, [selectedAction, actions]);

  async function createWithoutSchema() {
    try {
      setSaving(true);

      await createTask({
        profileId: Number(profileId),
        name,
        actionId: selectedAction,
        order: Number(order),
        config: {}, // no schema → empty config
      });

      toast.success("Task created");
      router.push("/automation/tasks");
    } catch (err: any) {
      toast.error(err.message || "Failed to create task");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="New Task"
        description="A task executes inside a profile schedule."
      />

      <div className="grid grid-cols-1 gap-6 bg-white p-6 rounded-lg shadow">
        {/* Profile select */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Profile</label>
          <Select value={profileId} onValueChange={setProfileId}>
            <SelectTrigger>
              <SelectValue placeholder="Select Profile" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Task name */}
        <div>
          <label className="text-sm font-medium">Task Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {/* Action select */}
        <div>
          <label className="text-sm font-medium">Action</label>
          <Select
            value={selectedAction}
            onValueChange={(v) => setSelectedAction(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Action" />
            </SelectTrigger>
            <SelectContent>
              {actions.map((act) => (
                <SelectItem key={act.id} value={act.id}>
                  {act.name}
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
            onChange={(e) => setOrder(e.target.value)}
          />
        </div>

        {/* ───────────────────────────────────────────
           If schema exists → show DynamicSchemaForm
           Else → Show Create button
        ─────────────────────────────────────────── */}
        {schema ? (
          <div className="border rounded-lg p-4">
            <DynamicSchemaForm
              schema={schema}
              submitLabel="Create Task"
              onSubmit={async (config) => {
                try {
                  await createTask({
                    profileId: Number(profileId),
                    name,
                    actionId: selectedAction,
                    order: Number(order),
                    config,
                  });

                  toast.success("Task created");
                  router.push("/automation/tasks");
                } catch (err: any) {
                  toast.error(err.message || "Failed to create task");
                }
              }}
            />
          </div>
        ) : (
          selectedAction && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={createWithoutSchema}
                disabled={saving}
                size="lg"
              >
                {saving ? "Creating..." : "Create Task"}
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
