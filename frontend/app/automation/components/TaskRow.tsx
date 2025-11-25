"use client";

import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy } from "lucide-react";
import { toast } from "sonner";

type Task = {
  id: number;
  profileId: number;
  cron: string;
  actionType: string;
  actionMeta: any;
};

export default function TaskRow({
  task,
  onRun,
  onEdit,
  onDelete,
}: {
  task: Task;
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <TableRow key={task.id}>
      <TableCell className="w-[220px]">{task.cron}</TableCell>
      <TableCell className="w-[260px]">{/* Human readable later (cronstrue) */}</TableCell>
      <TableCell>
        <Badge variant="outline">{task.actionType}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <pre className="max-w-[320px] truncate text-xs">{JSON.stringify(task.actionMeta)}</pre>
          <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(task.actionMeta)); toast.success("Copied meta") }}>
            <Copy size={14} />
          </Button>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onRun}>Run</Button>
          <Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>Delete</Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
