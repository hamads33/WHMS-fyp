"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Plus,
  Webhook,
  Send,
  MoreHorizontal,
  Trash2,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";

import { WebhooksAPI } from "@/lib/webhooks";

export default function WebhooksPage() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    url: "",
    secret: "",
  });

  const { data, isLoading, mutate } = useSWR(
    "/api/webhooks",
    WebhooksAPI.list
  );

  const webhooks = data?.webhooks || [];

  const columns = [
    {
      key: "name",
      header: "Webhook",
      render: (w) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Webhook className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{w.name}</p>
            <code className="text-xs text-muted-foreground">{w.url}</code>
          </div>
        </div>
      ),
    },
    {
      key: "events",
      header: "Events",
      render: (w) => (
        <div className="flex flex-wrap gap-1">
          {w.events.map((e) => (
            <Badge key={e} variant="secondary" className="text-xs">
              {e}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (w) => (
        <StatusBadge status={w.active ? "active" : "disabled"} />
      ),
    },
    {
      key: "enabled",
      header: "Enabled",
      render: (w) => (
        <Switch
          checked={w.active}
          onCheckedChange={async (v) => {
            await WebhooksAPI.toggle(w.id, v);
            mutate();
          }}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (w) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={async () => {
                await WebhooksAPI.test(w.id);
              }}
            >
              <Send className="mr-2 h-4 w-4" />
              Test
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={async () => {
                await WebhooksAPI.remove(w.id);
                mutate();
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground">
            Configure event notifications
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Webhook</DialogTitle>
              <DialogDescription>
                Register a new webhook endpoint
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Endpoint URL</Label>
                <Input
                  value={form.url}
                  onChange={(e) =>
                    setForm({ ...form, url: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Secret</Label>
                <Input
                  type="password"
                  value={form.secret}
                  onChange={(e) =>
                    setForm({ ...form, secret: e.target.value })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={async () => {
                  await WebhooksAPI.create(form);
                  setOpen(false);
                  setForm({ name: "", url: "", secret: "" });
                  mutate();
                }}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Webhooks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={webhooks}
            columns={columns}
            loading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
