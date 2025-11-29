"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createProfile, updateProfile } from "@/app/automation/api";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any;
  onSaved?: () => void;
}

export default function ProfileModal({
  open,
  onOpenChange,
  initial,
  onSaved
}: ProfileModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const editing = !!initial?.id;

  async function save() {
    if (editing) {
      await updateProfile(initial.id, { name, description });
    } else {
      await createProfile({ name, description });
    }

    onSaved?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Profile" : "New Profile"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <input
            className="border rounded w-full p-2"
            placeholder="Profile Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            className="border rounded w-full p-2"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <button
          onClick={save}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
        >
          Save
        </button>
      </DialogContent>
    </Dialog>
  );
}
