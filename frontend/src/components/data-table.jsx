"use client"

import React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * DataTable Component
 * Integrated with backend ID structures (e.g., Session ID, User ID).
 */
export function DataTable({ columns, data, onRowClick }) {
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
              key={item.id} // Maps to prisma models (User.id, Session.id)
              className={cn(onRowClick && "cursor-pointer hover:bg-muted/50")}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column) => (
                <TableCell key={String(column.key)} className={column.className}>
                  {column.cell ? column.cell(item) : String(item[column.key] ?? "")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/**
 * StatusBadge Component
 * Maps backend status fields to UI visual styles.
 */
export function StatusBadge({ status }) {
  const variants = {
    // Matches logic from ipAccess.service.js and user.service.js
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

  const config = variants[status?.toLowerCase()] || { variant: "secondary", className: "" }

  return (
    <Badge variant={config.variant} className={config.className}>
      {status}
    </Badge>
  )
}