"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function ProfilesTab() {
  const [profiles, setProfiles] = useState([
    { name: "Daily Automation", enabled: true },
    { name: "Weekly Automation", enabled: false },
  ]);

  const [newName, setNewName] = useState("");

  const addProfile = () => {
    setProfiles([...profiles, { name: newName, enabled: false }]);
    setNewName("");
    toast.success("Profile added.");
  };

  return (
    <div className="space-y-8">

      {/* EXISTING PROFILES */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Automation Profiles</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {profiles.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between border p-3 rounded-lg"
            >
              <span className="font-medium">{p.name}</span>
              <Switch
                checked={p.enabled}
                onCheckedChange={(v) => {
                  const updated = [...profiles];
                  updated[i].enabled = v;
                  setProfiles(updated);
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* CREATE NEW */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Create New Profile</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">
          <Input
            placeholder="Profile Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />

          <Button
            className="bg-yellow-500 text-black hover:bg-yellow-600 mt-2"
            onClick={addProfile}
          >
            Add Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
