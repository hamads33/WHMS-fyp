// /frontend/app/automation/components/DataTable/table-toolbar.tsx
"use client";

import React from "react";
import { Input } from "@/components/ui/input";

export function TableToolbar({
  search,
  onSearch,
  children,
}: {
  search: string;
  onSearch: (val: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <Input
        placeholder="Search..."
        className="w-64"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />

      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}
