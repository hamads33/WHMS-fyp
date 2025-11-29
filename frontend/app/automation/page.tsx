// frontend/app/automation/page.tsx
"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listProfiles, listTasks } from "@/app/automation/api";
import ProfilesList from "./components/profiles/ProfilesList";
import ProfilesSection from "./components/profiles/ProfilesSection";
import TasksSection from "./components/tasks/TasksSection";
import { Card } from "@/components/ui/card";

export default function AutomationPage() {
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
      <aside className="md:col-span-1 space-y-4">
        <Card className="p-4">
          <h3 className="font-bold">Profiles</h3>
          <ProfilesSection />
        </Card>
      </aside>

      <main className="md:col-span-3 space-y-4">
        <Card className="p-4">
          <h2 className="text-xl font-bold">Tasks for selected profile</h2>
          <div className="mt-4">
            <TasksSection profileId={selectedProfile ?? ""} />
          </div>
        </Card>
      </main>
    </div>
  );
}
