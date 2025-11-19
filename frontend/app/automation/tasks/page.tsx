// /frontend/app/automation/tasks/page.tsx
import PageHeader from "@/app/automation/components/PageHeader";
import TasksClient from "./tasks-client";
import { getProfiles } from "@/app/automation/utils/api";

export default async function TasksPage() {
  const profiles = await getProfiles();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Manage and organize all automation tasks per profile."
      />

      <TasksClient profiles={profiles} />
    </div>
  );
}
