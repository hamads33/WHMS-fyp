// /frontend/app/automation/profiles/page.tsx

import React from "react";
import Link from "next/link";
import PageHeader from "@/app/automation/components/PageHeader";
import { getProfiles } from "@/app/automation/utils/api";
import { DataTable } from "@/app/automation/components/DataTable";
import { TableToolbar } from "@/app/automation/components/DataTable/table-toolbar";
import StatusBadge from "@/app/automation/components/StatusBadge";
import ProfilesClient from "./profiles-client";

export default async function ProfilesPage() {
  const profiles = await getProfiles();

  return (
    <div>
      <PageHeader
        title="Profiles"
        description="Automation profiles define schedules and task execution logic."
      >
        <Link href="/automation/profiles/new" className="btn-primary">
          <span className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md">
            New Profile
          </span>
        </Link>
      </PageHeader>

      {/* Client wrapper handles delete dialogs + search */}
      <ProfilesClient initialData={profiles} />
    </div>
  );
}
