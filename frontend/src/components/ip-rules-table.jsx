"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function IpRulesTable({
  rules,
  isLoading,
  onEdit,
  onDelete,
}) {
  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Loading rules...
      </div>
    );
  }

  if (!rules.length) {
    return (
      <div className="py-12 text-center">
        <h3 className="text-lg font-semibold">No IP rules</h3>
        <p className="text-sm text-muted-foreground">
          Create your first rule
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pattern</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono">
                {r.pattern}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    r.type === "DENY"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {r.type}
                </Badge>
              </TableCell>
              <TableCell>
                {r.active ? (
                  <Badge>Active</Badge>
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
              </TableCell>
              <TableCell>
                {formatDistanceToNow(
                  new Date(r.createdAt),
                  { addSuffix: true }
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(r)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => onDelete(r.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
