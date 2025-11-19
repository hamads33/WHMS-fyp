"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { updateProfile, deleteProfile, listTasksByProfile, deleteTask } from "@/app/automation/utils/api";
import { JSONSchema } from "@/app/automation/components/DynamicSchemaForm/types";
import DynamicSchemaForm from "@/app/automation/components/DynamicSchemaForm";
import { CronBuilder } from "@/app/automation/components/Cron/CronBuilder";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenucontent,
  DropdownMenutrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type Props = {
  id: number;
  profile: any;
  schema: JSONSchema;
};

export default function ProfileEditorClient({ id, profile, schema }: Props) {
  const router = useRouter();

  const [cron, setCron] = useState(profile.cron);
  const [tasks, setTasks] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(true);

  /** Load tasks */
  const loadTasks = async () => {
    try {
      const list = await listTasksByProfile(id);
      setTasks(list || []);
    } catch (err) {
      console.error("Failed to load tasks", err);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  /** Save metadata + cron */
  const handleSave = async (values: any) => {
    setSaving(true);

    try {
      await updateProfile(id, {
        ...values,
        cron,
      });

      toast.success("Profile updated");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  /** Delete profile */
  const handleDeleteProfile = async () => {
    const confirmDelete = confirm("Delete this profile?");
    if (!confirmDelete) return;

    try {
      await deleteProfile(id);
      toast.success("Profile deleted");
      router.push("/automation/profiles");
    } catch (err: any) {
      toast.error(err.message || "Cannot delete profile (maybe tasks exist)");
    }
  };

  /** Delete task */
  const handleDeleteTask = async (taskId: number) => {
    const confirmDelete = confirm("Delete this task?");
    if (!confirmDelete) return;

    try {
      await deleteTask(taskId);
      toast.success("Task deleted");
      loadTasks();
    } catch (err: any) {
      toast.error("Failed to delete task");
    }
  };

  return (
    <div className="space-y-10">
      {/* Schedule (Cron Builder) */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>Define when this profile should run.</CardDescription>
        </CardHeader>

        <CardContent>
          <CronBuilder value={cron} onChange={setCron} />
        </CardContent>
      </Card>

      {/* Metadata Form */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>General information about this automation profile.</CardDescription>
        </CardHeader>

        <CardContent>
          <DynamicSchemaForm
            schema={schema}
            defaultValues={profile}
            onSubmit={handleSave}
            submitLabel={saving ? "Saving..." : "Save Changes"}
            disabled={saving}
          />
        </CardContent>
      </Card>

      {/* TASK LIST */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>Tasks executed whenever this profile triggers.</CardDescription>
            </div>

            <Link href={`/automation/tasks/new?profileId=${id}`}>
              <Button>Add Task</Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent>
          {loadingTasks ? (
            <p className="text-sm text-slate-500">Loading tasks…</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-slate-500">No tasks created yet.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <Card key={task.id} className="border bg-slate-50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{task.name}</div>
                      <div className="text-sm text-slate-500">
                        action: <span className="font-mono">{task.actionId}</span>
                      </div>
                      <Badge variant={task.isActive ? "default" : "secondary"}>
                        {task.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <DropdownMenu>
                      <DropdownMenutrigger asChild>
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                      </DropdownMenutrigger>
                      <DropdownMenucontent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/automation/tasks/${task.id}`)}
                        >
                          Edit
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenucontent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter>
          <Separator />
        </CardFooter>
      </Card>

      {/* Dangerous Zone */}
      <Card className="border-red-300">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Deleting a profile will remove its schedule permanently.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="destructive" onClick={handleDeleteProfile}>
            Delete Profile
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
