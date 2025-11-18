// app/automation/page.tsx
'use client';
import React from 'react';
import AutomationTabs from './components/AutomationTabs';
import ProfilesPage from './profiles/page';
import ActionsPage from './actions/page';
import RunsPage from './runs/page';

export default function AutomationLanding() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Automation</h1>

      <AutomationTabs>
        <div slot="profiles">
          <ProfilesPage />
        </div>
        <div slot="actions">
          <ActionsPage />
        </div>
        <div slot="runs">
          <RunsPage />
        </div>
        <div slot="status">
          <div className="p-6">Worker status panels coming soon — show cron schedule and last run times.</div>
        </div>
      </AutomationTabs>
    </div>
  );
}
