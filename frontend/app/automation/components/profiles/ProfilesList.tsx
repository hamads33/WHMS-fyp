"use client";

import { useEffect, useState } from "react";
import { listProfiles, deleteProfile, enableProfile, disableProfile } from "@/app/automation/api";

export default function ProfilesList({
  selectedId,
  onSelect
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [profiles, setProfiles] = useState<any[]>([]);

  async function load() {
    const res = await listProfiles();
    if (res.success) setProfiles(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-3">
      {profiles.map((p) => (
        <div
          key={p.id}
          className={`p-3 rounded border cursor-pointer ${selectedId === p.id ? "bg-blue-100" : ""}`}
          onClick={() => onSelect(p.id)}
        >
          <div className="font-semibold">{p.name}</div>
          <div className="text-sm text-gray-600">{p.description}</div>

          <div className="flex gap-2 mt-2">
            <button
              className="text-xs px-2 py-1 bg-green-200 rounded"
              onClick={(e) => {
                e.stopPropagation();
                enableProfile(p.id);
                load();
              }}
            >
              Enable
            </button>

            <button
              className="text-xs px-2 py-1 bg-yellow-200 rounded"
              onClick={(e) => {
                e.stopPropagation();
                disableProfile(p.id);
                load();
              }}
            >
              Disable
            </button>

            <button
              className="text-xs px-2 py-1 bg-red-200 rounded"
              onClick={async (e) => {
                e.stopPropagation();
                await deleteProfile(p.id);
                load();
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
