// /frontend/app/automation/components/DataTable/index.tsx
"use client";

import React from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

export interface Column<T> {
  key: keyof T;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
}: {
  columns: Column<T>[];
  data: T[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((c) => (
            <TableHead key={String(c.key)} className={c.className}>
              {c.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>

      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="py-6 text-center">
              No records found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((row, i) => (
            <TableRow key={i}>
              {columns.map((c) => (
                <TableCell key={String(c.key)}>
                  {c.render ? c.render(row) : (row as any)[c.key]}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
