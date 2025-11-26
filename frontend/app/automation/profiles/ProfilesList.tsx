"use client";

import { useEffect, useState } from "react";
import {
  listProfiles,
  deleteProfile,
  enableProfile,
  disableProfile,
  Profile,
} from "@/app/automation/api";

export default function ProfilesList({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  async function load() {
    const res = await listProfiles();
    if (res.success) setProfiles(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-2">
      {profiles.map((p) => (
        <div
          key={p.id}
          className={`p-3 border rounded cursor-pointer ${
            selectedId === p.id ? "bg-blue-100" : "bg-gray-50"
          }`}
          onClick={() => onSelect(p.id)}
        >
          <div className="font-medium">{p.name}</div>
          <div className="text-sm text-gray-600">{p.description}</div>

          <div className="flex gap-2 mt-2">
            <button
              className="px-2 py-1 text-xs bg-green-200 rounded"
              onClick={(e) => {
                e.stopPropagation();
                enableProfile(p.id);
                load();
              }}
            >
              Enable
            </button>

            <button
              className="px-2 py-1 text-xs bg-yellow-200 rounded"
              onClick={(e) => {
                e.stopPropagation();
                disableProfile(p.id);
                load();
              }}
            >
              Disable
            </button>

            <button
              className="px-2 py-1 text-xs bg-red-200 rounded"
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
