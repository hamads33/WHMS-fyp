// /frontend/app/automation/components/TaskTable.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Profile, Task } from "@/app/automation/utils/types";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export default function TaskTable({
  profile,
  tasks,
  search,
  onDelete,
  onRun,
}: {
  profile: Profile;
  tasks: Task[];
  search: string;
  onDelete: (id: number) => void;
  onRun: (id: number) => void;
}) {
  const [sortKey, setSortKey] = useState<keyof Task>("order");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const pageSize = 10;

  const filtered = useMemo(() => {
    return tasks
      .filter((t) =>
        search
          ? t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.actionId.toLowerCase().includes(search.toLowerCase())
          : true
      )
      .sort((a, b) => {
        const valA = a[sortKey] ?? "";
        const valB = b[sortKey] ?? "";
        if (valA < valB) return sortDir === "asc" ? -1 : 1;
        if (valA > valB) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [tasks, search, sortKey, sortDir]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h3 className="text-lg font-semibold">
        {profile.name} — Tasks ({tasks.length})
      </h3>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer"
              onClick={() => {
                setSortKey("name");
                setSortDir(sortDir === "asc" ? "desc" : "asc");
              }}
            >
              Name
            </TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {paginated.map((t) => (
            <TableRow key={t.id}>
              <TableCell>{t.name}</TableCell>
              <TableCell className="text-slate-600">{t.actionId}</TableCell>
              <TableCell>{t.order}</TableCell>

              <TableCell>
                {t.isActive ? (
                  <Badge className="bg-green-600">Active</Badge>
                ) : (
                  <Badge variant="secondary">Disabled</Badge>
                )}
              </TableCell>

              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/automation/tasks/${t.id}`}>Edit</Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => onRun(t.id)}>
                      Run Now
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => onDelete(t.id)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-3">
        <div className="text-sm text-slate-500">
          Showing {paginated.length} of {filtered.length}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page * pageSize >= filtered.length}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
