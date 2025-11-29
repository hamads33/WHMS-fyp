"use client";

import React, { useState } from "react";
import ProfilesList from "./ProfilesList";
import ProfileModal from "../modals/ProfileModal";
import { useProfiles, useDeleteProfile, useCreateProfile, useUpdateProfile } from "@/app/automation/hooks/queries";
import { toast } from "sonner";
import { Profile } from "@/app/automation/api";
import { ProfileSkeleton } from "@/app/automation/components/Skeletons";

export default function ProfilesSection() {
  const { data: profiles = [], isLoading } = useProfiles();
  const createMut = useCreateProfile();
  const updateMut = useUpdateProfile();
  const deleteMut = useDeleteProfile();
  const [selected, setSelected] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);

  function openCreate() { setSelected(null); setOpen(true); }
  function openEdit(p: Profile) { setSelected(p); setOpen(true); }

  async function handleDelete(id: string) {
    try {
      await toast.promise(deleteMut.mutateAsync(id), { loading: "Deleting...", success: "Deleted", error: "Delete failed" });
    } catch {}
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">Profiles</h3>
        <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={openCreate}>New</button>
      </div>

      {isLoading ? <ProfileSkeleton /> : (
        <ProfilesList
          profiles={profiles}
          selectedId={selected?.id ?? null}
          onSelect={(id)=> setSelected(profiles.find(p=>p.id===id) ?? null)}
          onEdit={openEdit}
          onDelete={handleDelete}
          onEnable={async (id)=> { await toast.promise(updateMut.mutateAsync({ id, payload: { enabled: true } } as any), {loading:"Enabling...", success:"Enabled", error:"Failed"} ); }}
          onDisable={async (id)=> { await toast.promise(updateMut.mutateAsync({ id, payload: { enabled: false } } as any), {loading:"Disabling...", success:"Disabled", error:"Failed"} ); }}
        />
      )}

      <ProfileModal open={open} onOpenChange={setOpen} initial={selected} onSaved={() => { setOpen(false); toast.success("Saved"); }} />
    </div>
  );
}
