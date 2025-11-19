// /frontend/app/automation/plugins/page.tsx
import React from "react";
import PageHeader from "@/app/automation/components/PageHeader";
import { listPlugins, listActions } from "@/app/automation/utils/api";
import PluginsClient from "./plugins-client";

export default async function PluginsPage() {
  const [plugins, actions] = await Promise.all([listPlugins(), listActions()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plugins"
        description="Upload, inspect and test user plugins. Installed plugins expose actions you can test here."
      />

      <PluginsClient initialPlugins={plugins} initialActions={actions} />
    </div>
  );
}
