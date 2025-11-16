"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function BillingTab() {
  const [invoiceGen, setInvoiceGen] = useState("7");
  const [reminder1, setReminder1] = useState("3");
  const [reminder2, setReminder2] = useState("1");
  const [suspendEnabled, setSuspendEnabled] = useState(true);
  const [suspendDays, setSuspendDays] = useState("2");
  const [autoUnsuspend, setAutoUnsuspend] = useState(true);

  const saveSettings = () => {
    toast.success("Billing automation saved.");
  };

  return (
    <div className="space-y-8">

      {/* INVOICE GENERATION */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Invoice Generation</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Generate invoices before due date</label>

            <Select value={invoiceGen} onValueChange={setInvoiceGen}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day before</SelectItem>
                <SelectItem value="3">3 days before</SelectItem>
                <SelectItem value="7">7 days before</SelectItem>
                <SelectItem value="14">14 days before</SelectItem>
              </SelectContent>
            </Select>

            <p className="text-sm text-muted-foreground">
              System will auto-generate invoices based on your selection.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* PAYMENT REMINDERS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Payment Reminders</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">

          <div>
            <label className="text-sm font-medium">1st Reminder (days before due)</label>
            <Input
              className="mt-2 w-[100px]"
              value={reminder1}
              onChange={(e) => setReminder1(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">2nd Reminder (days before due)</label>
            <Input
              className="mt-2 w-[100px]"
              value={reminder2}
              onChange={(e) => setReminder2(e.target.value)}
            />
          </div>

        </CardContent>
      </Card>

      {/* SUSPENSION RULES */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Account Suspension Rules</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Enable Overdue Suspension</span>
            <Switch checked={suspendEnabled} onCheckedChange={setSuspendEnabled} />
          </div>

          {suspendEnabled && (
            <div>
              <label className="text-sm font-medium">Suspend after (days overdue)</label>
              <Input
                className="mt-2 w-[120px]"
                value={suspendDays}
                onChange={(e) => setSuspendDays(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Auto-Unsuspend on Payment</span>
            <Switch checked={autoUnsuspend} onCheckedChange={setAutoUnsuspend} />
          </div>

        </CardContent>
      </Card>

      <Button className="bg-yellow-500 text-black hover:bg-yellow-600" onClick={saveSettings}>
        Save Billing Automation
      </Button>
    </div>
  );
}
