"use client";

import { useState } from "react";
import ProfilesSection from "./components/profiles/ProfilesSection";
import TasksSection from "./components/tasks/TasksSection";

export default function AutomationPage() {
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Automation Module</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProfilesSection
          selectedProfile={selectedProfile}
          onSelectProfile={setSelectedProfile}
        />

        <TasksSection profileId={selectedProfile} />
      </div>
    </div>
  );
}
