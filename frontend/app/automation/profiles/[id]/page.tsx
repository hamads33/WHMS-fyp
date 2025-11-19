// /frontend/app/automation/profiles/[id]/page.tsx

import { getProfile } from "@/app/automation/utils/api";
import ProfileEditorClient from "./profile-editor-client";
import { JSONSchema } from "@/app/automation/components/DynamicSchemaForm/types";
import PageHeader from "@/app/automation/components/PageHeader";

export default async function ProfileEditPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  const profile = await getProfile(id);

  // ❗ Cron field removed from schema (handled by CronBuilder)
  const schema: JSONSchema = {
    type: "object",
    required: ["name"],
    properties: {
      name: {
        type: "string",
        title: "Profile Name",
        default: profile.name,
      },
      timezone: {
        type: "string",
        title: "Timezone",
        default: profile.timezone ?? "UTC",
      },
      description: {
        type: "string",
        title: "Description",
        default: profile.description || "",
      },
      isActive: {
        type: "boolean",
        title: "Active",
        default: profile.isActive,
      },
    },
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Edit Profile — ${profile.name}`}
        description="Modify schedule, metadata and attached tasks."
      />

      <ProfileEditorClient id={id} profile={profile} schema={schema} />
    </div>
  );
}
