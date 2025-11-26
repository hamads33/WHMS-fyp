"use client";

import ProfilesList from "./ProfilesList";
import ProfileForm from "./ProfileForm";

export default function ProfilesSection({
  selectedProfile,
  onSelectProfile,
}: {
  selectedProfile: string | null;
  onSelectProfile: (id: string) => void;
}) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow space-y-4">
      <h2 className="text-xl font-semibold">Profiles</h2>
      <ProfilesList selectedId={selectedProfile} onSelect={onSelectProfile} />
      <ProfileForm />
    </div>
  );
}
