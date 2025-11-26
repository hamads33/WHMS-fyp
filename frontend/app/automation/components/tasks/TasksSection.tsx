"use client";

import TasksList from "./TasksList";
import TaskForm from "./TaskForm";

export default function TasksSection({
  profileId
}: {
  profileId: string | null;
}) {
  if (!profileId)
    return <div className="border p-4 rounded-lg bg-white shadow text-gray-600">Select a profile to view tasks.</div>;

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-white shadow">
      <h2 className="text-xl font-semibold">Tasks</h2>

      <TasksList profileId={profileId} />

      <hr/>

      <TaskForm profileId={profileId} />
    </div>
  );
}
