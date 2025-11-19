// /frontend/app/automation/tasks/[id]/page.tsx

import { getTask, listActions } from "@/app/automation/utils/api";
import TaskEditorClient from "./task-editor-client";

export default async function TaskEditPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const task = await getTask(id);
  const actions = await listActions();

  return (
    <TaskEditorClient task={task} actions={actions} />
  );
}
