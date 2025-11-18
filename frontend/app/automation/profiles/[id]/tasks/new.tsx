"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TaskForm from "../components/TaskForm";
import { ArrowLeft } from "lucide-react";

export default function NewTaskPage() {
  const { id } = useParams();
  const router = useRouter();

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
          <CardTitle>Create New Task</CardTitle>
        </CardHeader>

        <CardContent>
          <TaskForm
            profileId={Number(id)}
            onSuccess={() => {
              router.push(`/automation/profiles/${id}`);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
