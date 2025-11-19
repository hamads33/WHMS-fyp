// /frontend/app/automation/page.tsx

import React from "react";
import PageHeader from "@/app/automation/components/PageHeader";
import { getProfiles, listPlugins, listActions } from "@/app/automation/utils/api";

export const metadata = {
  title: "Automation Dashboard",
};

export default async function AutomationDashboard() {
  const [profiles, plugins, actions] = await Promise.all([
    getProfiles(),
    listPlugins(),
    listActions(),
  ]);

  // Count tasks via /tasks?profileId=...
  const tasksCount = await countAllTasks(profiles);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Automation"
        description="Automate billing, provisioning, notifications, and custom actions using visual profiles & tasks."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Profiles" count={profiles.length} href="/automation/profiles" />
        <StatCard label="Tasks" count={tasksCount} href="/automation/tasks" />
        <StatCard label="Actions" count={actions.length} href="/automation/actions" />
        <StatCard label="Plugins" count={plugins.length} href="/automation/plugins" />
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow space-y-6 border">
        <h3 className="text-lg font-medium">Quick Actions</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickLink title="New Profile" href="/automation/profiles/new" />
          <QuickLink title="New Task" href="/automation/tasks/new" />
          <QuickLink title="Manage Plugins" href="/automation/plugins" />
          <QuickLink title="Cron Builder" href="/automation/cron/builder" />
        </div>
      </div>
    </div>
  );
}

/* -----------------------------------------------
   Count tasks by iterating profiles
------------------------------------------------- */
async function countAllTasks(profiles: any[]) {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return 0;

  const calls = profiles.map(async (p) => {
    try {
      const res = await fetch(`${base}/automation/tasks?profileId=${p.id}`, {
        cache: "no-store",
      });
      const data = await res.json();
      return Array.isArray(data) ? data.length : 0;
    } catch {
      return 0;
    }
  });

  const counts = await Promise.all(calls);
  return counts.reduce((a, b) => a + b, 0);
}

/* -----------------------------------------------
   Components
------------------------------------------------- */
function StatCard({
  label,
  count,
  href,
}: {
  label: string;
  count: number;
  href: string;
}) {
  return (
    <a
      href={href}
      className="
        block bg-white p-6 rounded-lg shadow
        border hover:shadow-md transition
      "
    >
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-3xl font-semibold mt-2">{count}</div>
    </a>
  );
}

function QuickLink({ title, href }: { title: string; href: string }) {
  return (
    <a
      href={href}
      className="
        block p-4 border rounded-md 
        hover:bg-slate-50 transition 
        text-sm font-medium text-sky-600
      "
    >
      {title}
    </a>
  );
}
