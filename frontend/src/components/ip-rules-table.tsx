// src/components/ip-rules-table.tsx
"use client";
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import type { IpRule } from "@/lib/types/ipRule";
import { formatDistanceToNow } from "date-fns";

interface Props {
  rules: IpRule[];
  isLoading?: boolean;
  onEdit: (r: IpRule) => void;
  onDelete: (id: number) => void;
}

export function IpRulesTable({ rules, isLoading, onEdit, onDelete }: Props) {
  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading rules...</div>;
  }

  if (!rules || rules.length === 0) {
    return (
      <div className="py-12 text-center">
        <h3 className="text-lg font-semibold">No IP rules</h3>
        <p className="text-sm text-muted-foreground">Create your first rule to block or allow IPs.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Pattern</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-sm">{r.pattern}</TableCell>
              <TableCell>
                <Badge variant={r.type === "DENY" ? "destructive" : "secondary"}>{r.type}</Badge>
              </TableCell>
              <TableCell className="max-w-xs truncate">{r.description}</TableCell>
              <TableCell>{r.active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(r)}><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(r.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
