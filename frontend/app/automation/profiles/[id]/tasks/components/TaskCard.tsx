"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Play } from "lucide-react";
import { useTasks } from "@/app/automation/hooks/useTasks";

export default function TaskCard({ task, profileId }: any) {
  const { runTaskNow } = useTasks();

  return (
    <Card className="group hover:shadow-md transition cursor-pointer">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          {task.name}
          <Badge variant={task.isActive ? "default" : "secondary"}>
            {task.isActive ? "Active" : "Disabled"}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="text-sm space-y-3">
        <div>Action: {task.actionId}</div>
        <div>Order: {task.order}</div>
        <div>Retries: {task.retries}</div>

        <div className="flex justify-between pt-2">
          <Link
            href={`/automation/profiles/${profileId}/tasks/${task.id}/edit`}
          >
            <Button size="sm" variant="outline">
              <Edit className="w-4 h-4 mr-1" /> Edit
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={() => runTaskNow(task.id)}
            className="flex items-center gap-1"
          >
            <Play className="w-4 h-4" /> Run Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
