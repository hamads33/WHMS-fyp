// /frontend/app/automation/cron/builder/page.tsx

import React from "react";
import CronWizard from "./CronWizard";

export const metadata = {
  title: "Cron Builder | Automation",
  description: "Human-friendly and advanced cron expression builder",
};

export default function CronBuilderPage() {
  return (
    <div className="px-6 py-8">
      <CronWizard />
    </div>
  );
}
