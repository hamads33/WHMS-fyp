// /frontend/app/automation/actions/[id]/page.tsx
import React from "react";
import { listActions } from "@/app/automation/utils/api";
import PageHeader from "@/app/automation/components/PageHeader";
import ActionTestClient from "../action-test-client"

type Props = { params: { id: string } };

export default async function ActionDetailPage({ params }: Props) {
  const actionId = params.id;
  const actions = await listActions();
  const action = actions.find((a: any) => a.id === actionId);

  if (!action) {
    return (
      <div>
        <PageHeader title="Action Not Found" />
        <div className="bg-white p-6 rounded-lg shadow">Action &quot;{actionId}&quot; not found.</div>
      </div>
    );
  }

  // pass minimal action metadata to client
  return (
    <div className="space-y-6">
      <PageHeader
        title={action.name}
        description={`Action ID: ${action.id} • Version: ${action.version ?? "—"}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Schema</h3>
          <pre className="bg-slate-50 p-3 rounded text-sm overflow-auto">{JSON.stringify(action.jsonSchema ?? action.schema ?? {}, null, 2)}</pre>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-2">Test Action</h3>

          {/* Client component handles interactivity & form */}
          <ActionTestClient action={action} />
        </div>
      </div>
    </div>
  );
}
