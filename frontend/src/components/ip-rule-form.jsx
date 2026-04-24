"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function IpRuleForm({
  initial,
  onSubmit,
  isLoading = false,
  isEditing = false,
}) {
  /* ----------------------------------------------------
     INITIAL STATE (ONLY ONCE)
  ---------------------------------------------------- */
  const [form, setForm] = useState(() => ({
    action: initial?.type ?? "DENY",
    pattern: initial?.pattern ?? "",
    description: initial?.description ?? "",
    active: initial?.active ?? true,
  }));

  const [scope, setScope] = useState(() => {
    if (!initial?.pattern) return "specific";
    return initial.pattern.includes("/") || initial.pattern.includes("*")
      ? "wildcard"
      : "specific";
  });

  const [error, setError] = useState(null);

  /* ----------------------------------------------------
     Validation
  ---------------------------------------------------- */
  const validate = () => {
    if (!form.pattern.trim()) return "Pattern is required";

    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    const wildcardRegex =
      /^(\d{1,3}|\*)\.(\d{1,3}|\*)\.(\d{1,3}|\*)\.(\d{1,3}|\*)$/;

    if (scope === "specific" && !ipRegex.test(form.pattern.trim())) {
      return "Invalid IP format (e.g. 192.168.1.1)";
    }

    if (
      scope === "wildcard" &&
      !cidrRegex.test(form.pattern.trim()) &&
      !wildcardRegex.test(form.pattern.trim())
    ) {
      return "Use wildcard or CIDR (e.g. 192.168.*.* or 192.168.1.0/24)";
    }

    return null;
  };

  /* ----------------------------------------------------
     Submit
  ---------------------------------------------------- */
  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await onSubmit({
        pattern: form.pattern.trim(),
        type: form.action,
        description: form.description.trim(),
        active: form.active,
      });
    } catch (err) {
      setError(err?.message || "Something went wrong");
    }
  };

  /* ----------------------------------------------------
     UI
  ---------------------------------------------------- */
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-2">
        <Label>Action</Label>
        <Select
          value={form.action}
          onValueChange={(v) =>
            setForm((f) => ({ ...f, action: v }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DENY">Deny (Block)</SelectItem>
            <SelectItem value="ALLOW">Allow (Whitelist)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Pattern Type</Label>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="specific">Specific IP</SelectItem>
            <SelectItem value="wildcard">Wildcard / CIDR</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>{scope === "specific" ? "IP Address" : "IP Range"}</Label>
        <Input
          value={form.pattern}
          onChange={(e) =>
            setForm((f) => ({ ...f, pattern: e.target.value }))
          }
          placeholder={
            scope === "specific"
              ? "192.168.1.1"
              : "192.168.*.* or 192.168.1.0/24"
          }
        />
      </div>

      <div className="grid gap-2">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          rows={3}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Active</Label>
        <Switch
          checked={form.active}
          onCheckedChange={(v) =>
            setForm((f) => ({ ...f, active: v }))
          }
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading
          ? isEditing
            ? "Updating..."
            : "Saving..."
          : isEditing
          ? "Update Rule"
          : "Create Rule"}
      </Button>
    </form>
  );
}
