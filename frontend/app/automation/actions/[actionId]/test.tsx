"use client";

import { useParams } from "next/navigation";
import { useActions } from "@/app/automation/hooks/useActions";
import ActionInfo from "../components/ActionInfo";
import ActionTestForm from "../components/ActionTestForm";
import { Card } from "@/components/ui/card";

export default function ActionTestPage() {
  const { actionId } = useParams();
  const { actions } = useActions();

  const action = actions.find((a: any) => a.id === actionId);

  if (!action) return <div className="p-6">Action not found.</div>;

  return (
    <div className="p-6 space-y-6">
      <ActionInfo action={action} />

      <Card className="p-6">
        <ActionTestForm action={action} />
      </Card>
    </div>
  );
}
