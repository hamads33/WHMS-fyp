// /frontend/app/automation/components/TableToolbar.tsx
"use client";

import { Input } from "@/components/ui/input";

export function TableToolbar({
  search,
  onSearchChange,
  placeholder = "Search...",
}: {
  search: string;
  onSearchChange: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <Input
        className="w-72"
        placeholder={placeholder}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
}
