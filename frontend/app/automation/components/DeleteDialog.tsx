// /frontend/app/automation/components/DeleteDialog.tsx
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface DeleteDialogProps {
  itemName: string;
  onConfirm: () => Promise<void> | void;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;

  /** New controlled mode props — to support <DeleteDialog open=... onOpenChange=...> */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DeleteDialog({
  itemName,
  onConfirm,
  children,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  open,
  onOpenChange,
}: DeleteDialogProps) {
  // uncontrolled fallback
  const [_open, _setOpen] = useState(false);

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : _open;
  const setDialogOpen = isControlled ? onOpenChange! : _setOpen;

  const [loading, setLoading] = useState(false);

  const { toast } = useToast ? useToast() : { toast: { success: () => {}, error: () => {} } };

  const doConfirm = async () => {
    try {
      setLoading(true);
      await Promise.resolve(onConfirm());
      setDialogOpen(false);
      toast?.success?.(`${itemName} deleted`);
    } catch (err: any) {
      console.error("DeleteDialog:", err);
      toast?.error?.(err?.message ?? "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const Trigger = (
    <DialogTrigger asChild>
      {children ?? (
        <Button variant="destructive" size="sm" className="flex items-center gap-2">
          <Trash className="w-4 h-4" />
          Delete
        </Button>
      )}
    </DialogTrigger>
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {Trigger}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {itemName}?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. Are you sure you want to permanently delete{" "}
            <strong>{itemName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant="destructive" onClick={doConfirm} disabled={loading}>
            {loading ? "Deleting…" : confirmLabel}
          </Button>
        </div>

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}

export default DeleteDialog;
