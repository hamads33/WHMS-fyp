"use client"

import type React from "react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Column<T> {
  key: keyof T | string
  header: string
  cell?: (item: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (item: T) => void
}

export function DataTable<T extends { id: string | number }>({ columns, data, onRowClick }: DataTableProps<T>) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {columns.map((column) => (
              <TableHead key={String(column.key)} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={item.id}
              className={cn(onRowClick && "cursor-pointer hover:bg-muted/50")}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column) => (
                <TableCell key={String(column.key)} className={column.className}>
                  {column.cell ? column.cell(item) : String(item[column.key as keyof T] ?? "")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> =
    {
      active: { variant: "default", className: "bg-success text-success-foreground" },
      suspended: { variant: "destructive", className: "" },
      pending: { variant: "secondary", className: "bg-warning text-warning-foreground" },
      expired: { variant: "destructive", className: "" },
      paid: { variant: "default", className: "bg-success text-success-foreground" },
      unpaid: { variant: "destructive", className: "" },
      open: { variant: "default", className: "bg-success text-success-foreground" },
      closed: { variant: "secondary", className: "" },
      answered: { variant: "secondary", className: "bg-chart-2 text-foreground" },
    }

  const config = variants[status.toLowerCase()] || { variant: "secondary" as const, className: "" }

  return (
    <Badge variant={config.variant} className={config.className}>
      {status}
    </Badge>
  )
}
