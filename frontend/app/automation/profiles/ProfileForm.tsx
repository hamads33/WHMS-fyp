"use client";

import { useState } from "react";
import { createProfile } from "@/app/automation/api";
import CronBuilder from "../cron/CronBuilder";

export default function ProfileForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cron, setCron] = useState("");

  async function save() {
    await createProfile({ name, description, cron });
    window.location.reload();
  }

  return (
    <div className="border p-4 rounded bg-gray-50">
      <h3 className="font-semibold mb-2">Create Profile</h3>

      <input
        className="border p-2 rounded w-full mb-2"
        placeholder="Profile name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <textarea
        className="border p-2 rounded w-full mb-2"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <CronBuilder value={cron} onChange={setCron} />

      <button className="mt-3 px-3 py-1 bg-blue-500 text-white rounded" onClick={save}>
        Save Profile
      </button>
    </div>
  );
}
