"use client";

import Link from "next/link";
import { useActions } from "@/app/automation/hooks/useActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Plug } from "lucide-react";

export default function ActionsPage() {
  const { actions, isLoading } = useActions();

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold flex items-center gap-2">
        <Plug className="w-6 h-6" /> Installed Actions
      </h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action: any) => (
          <Link key={action.id} href={`/automation/actions/${action.id}/test`}>
            <Card className="cursor-pointer hover:shadow-lg transition">
              <CardHeader>
                <CardTitle>{action.name}</CardTitle>
              </CardHeader>

              <CardContent className="text-sm space-y-2">
                <p>{action.description}</p>
                <p className="text-muted-foreground text-xs">
                  v{action.version}
                </p>

                <div className="flex justify-end pt-4">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
