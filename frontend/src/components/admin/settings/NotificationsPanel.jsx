"use client";

import { useState, useEffect } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api/client";

export default function NotificationsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState({});
  const [saving, setSaving] = useState({});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch("/admin/settings/notifications");
      if (data.success) {
        setNotifications(data.notifications || {});
      }
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(key, value) {
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      const settingKey = `notifications.${key}`;
      const data = await apiFetch(`/admin/settings/${settingKey}`, {
        method: "PUT",
        body: JSON.stringify({ value }),
      });
      if (data.success) {
        setNotifications(prev => ({ ...prev, [key]: value }));
        toast({ title: `${key} notification ${value ? "enabled" : "disabled"}` });
      } else {
        throw new Error(data.error || "Failed to update");
      }
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading notification settings...
      </div>
    );
  }

  const groups = {
    service: {
      title: 'Service Events',
      events: [
        { key: 'service.activated', label: 'Service Activated', desc: 'When hosting account provisioning completes' },
        { key: 'service.suspended', label: 'Service Suspended', desc: 'When service is suspended due to non-payment' },
        { key: 'service.terminated', label: 'Service Terminated', desc: 'When service is terminated' },
      ]
    },
    billing: {
      title: 'Billing Events',
      events: [
        { key: 'billing.invoice_created', label: 'Invoice Created', desc: 'New invoice generated' },
        { key: 'billing.payment_received', label: 'Payment Received', desc: 'Payment successfully recorded' },
        { key: 'billing.payment_overdue', label: 'Payment Overdue', desc: 'Invoice payment is overdue' },
        { key: 'billing.refund_issued', label: 'Refund Issued', desc: 'Refund processed' },
      ]
    },
    order: {
      title: 'Order Events',
      events: [
        { key: 'order.placed', label: 'Order Placed', desc: 'New order created' },
      ]
    },
    support: {
      title: 'Support Events',
      events: [
        { key: 'support.ticket_created', label: 'Ticket Created', desc: 'New support ticket opened' },
        { key: 'support.ticket_reply', label: 'Ticket Reply', desc: 'Support staff replies to ticket' },
        { key: 'support.ticket_closed', label: 'Ticket Closed', desc: 'Support ticket resolved' },
      ]
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Control which notifications are sent to clients. All notifications are enabled by default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {Object.entries(groups).map(([groupKey, group]) => (
              <div key={groupKey}>
                <h3 className="text-sm font-semibold mb-4">{group.title}</h3>
                <div className="space-y-3">
                  {group.events.map(event => (
                    <div key={event.key} className="flex items-center justify-between rounded-lg border px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{event.label}</p>
                        <p className="text-xs text-muted-foreground">{event.desc}</p>
                      </div>
                      <Switch
                        checked={notifications[event.key] ?? true}
                        onCheckedChange={(val) => handleToggle(event.key, val)}
                        disabled={saving[event.key]}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
