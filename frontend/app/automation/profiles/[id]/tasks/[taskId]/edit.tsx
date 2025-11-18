"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TaskForm from "../../components/TaskForm";
import { ArrowLeft } from "lucide-react";
import { useTasks } from "@/app/automation/hooks/useTasks";
import { useActions } from "@/app/automation/hooks/useActions";

export default function EditTaskPage() {
  const { id, taskId } = useParams();
  const router = useRouter();

  const { getTaskById } = useTasks();
  const { getActionById } = useActions();

  const task = getTaskById(Number(taskId));

  if (!task) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Loading task…
      </div>
    );
  }

  const actionMeta = getActionById(task.actionId);

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Task</CardTitle>
        </CardHeader>

        <CardContent>
          <TaskForm
            profileId={Number(id)}
            taskId={Number(taskId)}
            defaultValues={{
              name: task.name,
              actionId: task.actionId,
              order: task.order,
              isActive: task.isActive,
              retries: task.retries,
              backoffMs: task.backoffMs,
              config: task.config
            }}
            actionSchema={actionMeta?.jsonSchema || null}
            onSuccess={() => {
              router.push(`/automation/profiles/${id}`);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
