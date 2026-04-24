"use client";

import { useState, useEffect } from "react";
import {
  Webhook, Plus, Trash2, Pencil, Loader2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { WebhooksAPI } from "@/lib/webhooks";

const ALL_EVENTS = [
  "ACCOUNT_CREATED",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_TERMINATED",
  "SERVER_DOWN",
  "HIGH_CPU_USAGE",
  "SERVER_ADDED",
];

const EVENT_LABELS = {
  ACCOUNT_CREATED: "Account Created",
  ACCOUNT_SUSPENDED: "Account Suspended",
  ACCOUNT_TERMINATED: "Account Terminated",
  SERVER_DOWN: "Server Down",
  HIGH_CPU_USAGE: "High CPU Usage",
  SERVER_ADDED: "Server Added",
};

function WebhookFormDialog({ open, onClose, onSaved, initial }) {
  const { toast } = useToast();
  const isEdit = Boolean(initial);
  const [url, setUrl] = useState(initial?.url ?? "");
  const [events, setEvents] = useState(initial?.events ?? []);
  const [secret, setSecret] = useState(initial?.secret ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setUrl(initial?.url ?? "");
      setEvents(initial?.events ?? []);
      setSecret(initial?.secret ?? "");
      setIsActive(initial?.isActive ?? true);
    }
  }, [open, initial]);

  function toggleEvent(ev) {
    setEvents(prev => prev.includes(ev) ? prev.filter(x => x !== ev) : [...prev, ev]);
  }

  async function handleSave() {
    if (!url.trim()) {
      toast({ variant: "destructive", title: "URL is required" });
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await WebhooksAPI.update(initial.id, { url: url.trim(), events, secret, isActive });
        toast({ title: "Webhook updated" });
      } else {
        await WebhooksAPI.create({ url: url.trim(), events, secret, isActive });
        toast({ title: "Webhook created" });
      }
      onSaved();
      onClose();
    } catch (err) {
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Webhook" : "New Webhook"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update webhook configuration." : "Create a new webhook endpoint."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="webhook_url">Endpoint URL</Label>
            <Input
              id="webhook_url"
              type="url"
              placeholder="https://example.com/webhooks"
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Events</Label>
            <div className="rounded-lg border divide-y">
              {ALL_EVENTS.map(ev => (
                <label key={ev} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors">
                  <Checkbox
                    checked={events.includes(ev)}
                    onCheckedChange={() => toggleEvent(ev)}
                  />
                  <span className="text-sm">{EVENT_LABELS[ev]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="webhook_secret">Secret (optional)</Label>
            <Input
              id="webhook_secret"
              type="password"
              placeholder="••••••••"
              value={secret}
              onChange={e => setSecret(e.target.value)}
            />
          </div>

          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <Label htmlFor="webhook_active" className="text-sm font-normal cursor-pointer">Active</Label>
              <Switch id="webhook_active" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Webhook"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WebhooksPanel() {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editWebhook, setEditWebhook] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await WebhooksAPI.list();
      setWebhooks(Array.isArray(data) ? data : (data.webhooks ?? []));
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to load webhooks", description: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    setDeleting(true);
    try {
      await WebhooksAPI.remove(id);
      toast({ title: "Webhook deleted" });
      load();
    } catch (err) {
      toast({ variant: "destructive", title: "Delete failed", description: err.message });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Webhooks</CardTitle>
              <CardDescription className="mt-0.5">
                Send real-time notifications to external endpoints when events occur.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => { setEditWebhook(null); setDialogOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading webhooks…
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Webhook className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-sm">No webhooks configured</p>
              <p className="text-xs mt-1">Create webhooks to receive real-time event notifications.</p>
              <Button size="sm" className="mt-4" onClick={() => { setEditWebhook(null); setDialogOpen(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Create webhook
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((wh) => (
                  <TableRow key={wh.id}>
                    <TableCell className="font-mono text-sm">{wh.url}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(wh.events || []).slice(0, 2).map(ev => (
                          <Badge key={ev} variant="secondary" className="text-[10px]">{EVENT_LABELS[ev] || ev}</Badge>
                        ))}
                        {(wh.events || []).length > 2 && (
                          <Badge variant="secondary" className="text-[10px]">+{wh.events.length - 2} more</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {wh.isActive ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditWebhook(wh); setDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(wh.id)} disabled={deleting}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <WebhookFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => load()}
        initial={editWebhook}
      />
    </div>
  );
}
