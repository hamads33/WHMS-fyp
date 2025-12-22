"use client";
import { useCallback, useState } from "react";
import useSWR from "swr";
import { IpRulesTable } from "./ip-rules-table";
import { IpRuleForm } from "./ip-rule-form";
import { IpRulesAPI } from "@/lib/iprules";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus } from "lucide-react";

const fetcher = () => IpRulesAPI.listRules();

export function IpRulesPageClient() {
  const { data: rules = [], mutate, isLoading } = useSWR("/api/ip-rules", fetcher);

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createRule = useCallback(
    async (payload) => {
      setIsSubmitting(true);
      try {
        await IpRulesAPI.createRule(payload);
        await mutate();
        setCreateOpen(false);
      } finally {
        setIsSubmitting(false);
      }
    },
    [mutate]
  );

  const updateRule = useCallback(
    async (payload) => {
      if (!editing) return;
      setIsSubmitting(true);
      try {
        await IpRulesAPI.updateRule(editing.id, payload);
        await mutate();
        setEditOpen(false);
        setEditing(null);
      } finally {
        setIsSubmitting(false);
      }
    },
    [editing, mutate]
  );

  const doDelete = useCallback(async () => {
    if (!deleteId) return;
    setIsSubmitting(true);
    try {
      await IpRulesAPI.deleteRule(deleteId);
      await mutate();
      setIsDeleteOpen(false);
      setDeleteId(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [deleteId, mutate]);

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">IP Rules</h1>
          <p className="text-muted-foreground">
            Manage IP allow/deny rules
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create IP Rule</DialogTitle>
            </DialogHeader>
            <IpRuleForm onSubmit={createRule} isLoading={isSubmitting} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
          <CardDescription>List of IP rules</CardDescription>
        </CardHeader>
        <CardContent>
          <IpRulesTable
            rules={rules}
            isLoading={isLoading}
            onEdit={(r) => {
              setEditing(r);
              setEditOpen(true);
            }}
            onDelete={(id) => {
              setDeleteId(id);
              setIsDeleteOpen(true);
            }}
          />
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit IP Rule</DialogTitle>
          </DialogHeader>
          {editing && (
  <IpRuleForm
    key={editing.id}   
    initial={editing}
    onSubmit={updateRule}
    isLoading={isSubmitting}
    isEditing
  />
)}

        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete rule</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="bg-destructive"
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
