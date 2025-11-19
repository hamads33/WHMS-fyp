"use client";

import React, { useState, useMemo } from "react";
import { Profile } from "@/app/automation/utils/types";
import { useRouter } from "next/navigation";
import { deleteProfile } from "@/app/automation/utils/api";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/app/automation/components/DataTable";
import { TableToolbar } from "@/app/automation/components/DataTable/table-toolbar";
import StatusBadge from "@/app/automation/components/StatusBadge";
import { DeleteDialog } from "@/app/automation/components/DeleteDialog";
import { toast } from "sonner";

export default function ProfilesClient({
  initialData,
}: {
  initialData: Profile[];
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    return data.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, data]);

  // Correct confirmDelete: receives ID directly
  async function confirmDelete(id: number) {
    try {
      await deleteProfile(id);
      toast.success("Profile deleted");

      setData((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  }

  const columns: Column<Profile>[] = [
    { key: "name", label: "Name" },

    {
      key: "cron",
      label: "Cron",
      render: (row) => (
        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
          {row.cron}
        </span>
      ),
    },

    {
      key: "isActive",
      label: "Status",
      render: (row) => <StatusBadge active={row.isActive} />,
    },

    {
      key: "actions" as any,
      label: "",
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">⋮</Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => router.push(`/automation/profiles/${row.id}`)}>
              Edit
            </DropdownMenuItem>

            {/* Delete inside row */}
            <DeleteDialog
              itemName={`Profile ${row.name}`}
              onConfirm={() => confirmDelete(row.id)}
            >
              <DropdownMenuItem className="text-red-600">
                Delete
              </DropdownMenuItem>
            </DeleteDialog>

          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <TableToolbar search={search} onSearch={setSearch} />

      <div className="bg-white rounded-lg border shadow">
        <DataTable columns={columns} data={filtered} />
      </div>
    </div>
  );
}
