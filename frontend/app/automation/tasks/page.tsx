"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import * as api from "@/app/automation/utils/api";
import TaskForm from "@/app/automation/tasks/TaskForm";
import TaskRow from "@/app/automation/components/TaskRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function TasksPage() {
  const qc = useQueryClient();
  const [profileId, setProfileId] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tasks", profileId],
    queryFn: () => api.listTasks(Number(profileId)),
    enabled: !!profileId,
  });

  const runTask = useMutation({
    mutationFn: (id: number) => api.runTask(id),
    onSuccess: () => toast.success("Task run started"),
    onError: () => toast.error("Failed to run task"),
  });

  const deleteTask = useMutation({
    mutationFn: (id: number) => api.deleteTask(id),
    onSuccess: () => {
      toast.success("Task deleted");
      qc.invalidateQueries({ queryKey: ["tasks", profileId] });
    },
    onError: () => toast.error("Failed to delete"),
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Automation Tasks</h1>
          <p className="text-sm text-muted-foreground">Manage scheduled tasks for profiles.</p>
        </div>

        <div className="flex items-center gap-3">
          <Input placeholder="Profile ID" value={profileId} onChange={(e) => setProfileId(e.target.value)} className="w-40"/>
          <Button onClick={() => refetch()} disabled={!profileId}>Load</Button>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }} disabled={!profileId}>+ Add Task</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cron</TableHead>
                  <TableHead>Readable</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading && Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))}

                {!isLoading && (!data?.data || data.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No tasks found.</TableCell>
                  </TableRow>
                )}

                {data?.data?.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onRun={() => runTask.mutate(task.id)}
                    onEdit={() => { setEditing(task); setModalOpen(true); }}
                    onDelete={() => deleteTask.mutate(task.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <TaskForm
        open={modalOpen}
        initialTask={editing}
        onClose={() => { setModalOpen(false); qc.invalidateQueries({ queryKey: ["tasks", profileId] }); }}
      />
    </div>
  );
}
