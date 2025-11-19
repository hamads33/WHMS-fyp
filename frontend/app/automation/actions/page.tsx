// /frontend/app/automation/actions/page.tsx
import React from "react";
import Link from "next/link";
import PageHeader from "@/app/automation/components/PageHeader";
import { listActions } from "@/app/automation/utils/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function ActionsPage() {
  const actions = await listActions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Actions"
        description="Available built-in and plugin actions. Test actions with sample config."
      >
        <Link href="/automation/plugins">
          <Button variant="ghost">Manage Plugins</Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {actions.map((act: any) => (
          <Card key={act.id} className="border">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{act.name}</span>
                <span className="text-xs text-slate-500">{act.version ?? "—"}</span>
              </CardTitle>
              <CardDescription className="text-sm text-slate-600">
                {act.source ? `${act.source}` : "action"}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="text-sm text-slate-700 mb-4">
                {act.description ?? "No description provided."}
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/automation/actions/${act.id}`}>
                  <Button size="sm">Test Action</Button>
                </Link>
                <Link href={`/automation/actions/${act.id}`}>
                  <Button variant="outline" size="sm">View Schema</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
