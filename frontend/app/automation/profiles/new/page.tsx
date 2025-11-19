// /frontend/app/automation/profiles/new/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/app/automation/components/PageHeader";
import DynamicSchemaForm from "@/app/automation/components/DynamicSchemaForm";
import { JSONSchema } from "@/app/automation/components/DynamicSchemaForm/types";
import CronBuilder from "@/app/automation/cron/components/CronBuilder";
import { createProfile } from "@/app/automation/utils/api";
import { toast } from "sonner";

// ❗ No "cron" field here — CronBuilder controls cron
const schema: JSONSchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string", title: "Profile Name" },
    timezone: { type: "string", title: "Timezone", default: "UTC" },
    description: { type: "string", title: "Description" },
    isActive: { type: "boolean", title: "Active", default: true },
  },
};

export default function NewProfilePage() {
  const router = useRouter();

  // Default cron expression
  const [cron, setCron] = useState("*/10 * * * * *");

  return (
    <div className="space-y-8">
      <PageHeader
        title="New Profile"
        description="Define automation metadata & scheduling rules."
      />

      {/* 🔥 Cron Builder Section */}
      <CronBuilder value={cron} onChange={setCron} />

      {/* Metadata Form */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <DynamicSchemaForm
          schema={schema}
          defaultValues={{}}
          onSubmit={async (values) => {
            const payload = { ...values, cron };

            try {
              await createProfile(payload);
              toast.success("Profile created");
              router.push("/automation/profiles");
            } catch (err: any) {
              toast.error(err.message || "Failed to create profile");
            }
          }}
          submitLabel="Create Profile"
        />
      </div>
    </div>
  );
}
