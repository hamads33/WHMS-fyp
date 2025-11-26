"use client";

import ProfilesList from "./ProfilesList";
import ProfileForm from "./ProfileForm";

export default function ProfilesSection({
  selectedProfile,
  onSelectProfile
}: {
  selectedProfile: string | null;
  onSelectProfile: (id: string) => void;
}) {
  return (
    <div className="space-y-4 border rounded-lg p-4 bg-white shadow">
      <h2 className="text-xl font-semibold">Profiles</h2>

      <ProfilesList onSelect={onSelectProfile} selectedId={selectedProfile} />

      <hr className="my-4" />

      <ProfileForm />
    </div>
  );
}
