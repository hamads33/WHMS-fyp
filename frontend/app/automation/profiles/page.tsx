"use client";

import { useState } from "react";
import { useProfiles } from "@/app/automation/hooks/useProfiles";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus } from "lucide-react";
import Link from "next/link";
import ProfileForm from "../components/ProfileForm";

export default function ProfilesPage() {
  const { profiles = [], isLoading, createProfile } = useProfiles(); // ✅ fixed
  const [open, setOpen] = useState(false);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Automation Profiles</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> New Profile
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Automation Profile</DialogTitle>
            </DialogHeader>

            <ProfileForm
              onSubmit={async (values) => {
                await createProfile.mutateAsync(values);
                setOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.map((profile: any) => (
          <Link key={profile.id} href={`/automation/profiles/${profile.id}`}>
            <Card className="hover:bg-accent cursor-pointer transition">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {profile.name}
                  <Badge variant={profile.isActive ? "default" : "secondary"}>
                    {profile.isActive ? "Active" : "Inactive"}
                  </Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="text-sm text-muted-foreground space-y-1">
                <div>Cron: {profile.cron}</div>
                <div>Timezone: {profile.timezone}</div>
                <div>Tasks: {profile._count?.tasks || 0}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
