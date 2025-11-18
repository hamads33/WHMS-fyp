"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ProfileForm from "../components/ProfileForm";
import { useProfiles } from "@/app/automation/hooks/useProfiles";
import { ArrowLeft } from "lucide-react";

export default function EditProfilePage() {
  const { id } = useParams();
  const router = useRouter();

  const { getProfileById, updateProfile } = useProfiles();
  const profile = getProfileById(Number(id));

  if (!profile) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
        </CardHeader>

        <CardContent>
          <ProfileForm
            defaultValues={{
              name: profile.name,
              description: profile.description || "",
              cron: profile.cron,
              timezone: profile.timezone,
              isActive: profile.isActive,
            }}
            onSubmit={async (values) => {
              await updateProfile(profile.id, values);
              router.push(`/automation/profiles/${profile.id}`);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
