"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit } from "lucide-react";
import Link from "next/link";
import { useProfiles } from "@/app/automation/hooks/useProfiles";
import TaskCard from "./components/TaskCard";

export default function ProfileDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const { getProfileById, isLoading } = useProfiles();
  const profile = getProfileById(Number(id));

  if (isLoading || !profile) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{profile.name}</h1>
          <div className="text-sm text-muted-foreground">
            Cron: {profile.cron} • Timezone: {profile.timezone}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link href={`/automation/profiles/${id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" /> Edit Profile
            </Button>
          </Link>
          <Badge variant={profile.isActive ? "default" : "secondary"}>
            {profile.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Task Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tasks</h2>

        <Link href={`/automation/profiles/${id}/tasks/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Add Task
          </Button>
        </Link>
      </div>

      {/* Task List */}
      {profile.tasks?.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No tasks added yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profile.tasks
            .sort((a: any, b: any) => a.order - b.order)
            .map((task: any) => (
              <TaskCard
                key={task.id}
                task={task}
                profileId={profile.id}
              />
            ))}
        </div>
      )}
    </div>
  );
}
