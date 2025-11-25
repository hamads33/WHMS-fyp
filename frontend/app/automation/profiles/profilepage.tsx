"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import * as api from "@/app/automation/utils/api";
import ActionsMenu from "@/app/automation/components/ActionsMenu";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input as UiInput } from "@/components/ui/input";
import { useDebounce } from "use-debounce"; // optional: install if you want debounce; otherwise ignore

const TIMEZONES = [
  "UTC","GMT","Europe/London","Europe/Berlin","Europe/Paris","Asia/Karachi",
  "Asia/Dubai","Asia/Kolkata","Asia/Singapore","Asia/Tokyo","Asia/Shanghai",
  "Australia/Sydney","America/New_York","America/Chicago","America/Denver",
  "America/Los_Angeles","America/Toronto","America/Vancouver","America/Bogota",
  "Africa/Johannesburg","Africa/Cairo","Europe/Moscow","Asia/Riyadh","Asia/Jakarta"
];

export default function ProfilesPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 200);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<null | number>(null);
  const [form, setForm] = useState({ name: "", timezone: "UTC" });

  const { data, isLoading } = useQuery({
    queryKey: ["profiles", debouncedQuery],
    queryFn: api.listProfiles,
  });

  const createProfile = useMutation({
    mutationFn: api.createProfile,
    onSuccess: () => {
      toast.success("Profile created");
      qc.invalidateQueries({ queryKey: ["profiles"] });
      setModalOpen(false);
      setForm({ name: "", timezone: "UTC" });
    },
    onError: () => toast.error("Failed to create profile"),
  });

  const updateProfile = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => api.updateProfile(id, body),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profiles"] });
      setModalOpen(false);
      setEditing(null);
      setForm({ name: "", timezone: "UTC" });
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const deleteProfile = useMutation({
    mutationFn: api.deleteProfile,
    onSuccess: () => {
      toast.success("Profile deleted");
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: () => toast.error("Failed to delete"),
  });

  const toggleEnable = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      enabled ? api.enableProfile(id) : api.disableProfile(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
    onError: () => toast.error("Failed to update status"),
  });

  function openEdit(p: { id: number; name: string; timezone: string }) {
    setEditing(p.id);
    setForm({ name: p.name, timezone: p.timezone });
    setModalOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: "", timezone: "UTC" });
    setModalOpen(true);
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Automation Profiles</h1>
          <p className="text-sm text-muted-foreground">Manage cron profiles and quick actions.</p>
        </div>

        <div className="flex items-center gap-3">
          <Input
            placeholder="Search profiles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-64"
          />
          <Button onClick={openCreate}>+ Create</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profiles</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading && (
                  <>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      </TableRow>
                    ))}
                  </>
                )}

                {!isLoading && (!data?.data || data.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      No profiles found.
                    </TableCell>
                  </TableRow>
                )}

                {data?.data?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.timezone}</TableCell>
                    <TableCell>
                      <Switch
                        checked={p.enabled}
                        onCheckedChange={(val) => toggleEnable.mutate({ id: p.id, enabled: val })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <ActionsMenu
                        onEdit={() => openEdit(p)}
                        onDelete={() => deleteProfile.mutate(p.id)}
                        extraItems={[
                          { label: "Run now", onClick: () => api.runProfile(p.id).then(() => toast.success("Profile run started")).catch(() => toast.error("Failed")) }
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Profile" : "Create Profile"}</DialogTitle>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (editing) updateProfile.mutate({ id: editing, body: form });
              else createProfile.mutate(form);
            }}
          >
            <UiInput
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Profile name"
              required
            />

            <Select onValueChange={(v) => setForm((f) => ({ ...f, timezone: v }))} value={form.timezone}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex justify-end gap-2">
              <Button type="submit">{editing ? "Update" : "Create"}</Button>
              <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
