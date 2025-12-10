// src/components/ip-rule-form.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { IpRuleAction, IpRuleScope } from "@/lib/types/ipRule";
import type { IpRule } from "@/lib/types/ipRule";

interface IpRuleFormProps {
  initial?: Partial<IpRule>;
  onSubmit: (payload: {
    pattern: string;
    type: IpRuleAction;
    description?: string;
    active?: boolean;
  }) => Promise<void> | void;
  isLoading?: boolean;
  isEditing?: boolean;
}

export function IpRuleForm({ initial, onSubmit, isLoading = false, isEditing = false }: IpRuleFormProps) {
  // sensible defaults for create mode
  const initialScope: IpRuleScope =
    initial?.pattern && (initial.pattern.includes("/") || initial.pattern.includes("*")) ? "wildcard" : "specific";

  const [scope, setScope] = useState<IpRuleScope>(initialScope);
  const [action, setAction] = useState<IpRuleAction>(initial?.type ?? "DENY");
  const [pattern, setPattern] = useState(initial?.pattern ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  // Sync form fields when `initial` changes (important for edit modal)
  useEffect(() => {
    if (!initial) return;
    setAction((initial.type ?? "DENY") as IpRuleAction);
    setPattern(initial.pattern ?? "");
    setDescription(initial.description ?? "");
    setActive(initial.active ?? true);
    setScope(
      initial.pattern && (initial.pattern.includes("/") || initial.pattern.includes("*")) ? "wildcard" : "specific"
    );
  }, [initial]);

  const validate = (): string | null => {
    if (!pattern.trim()) return "Pattern is required";
    // basic IP/CIDR/wildcard checks
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    const wildcardRegex = /^(\d{1,3}|\*)\.(\d{1,3}|\*)\.(\d{1,3}|\*)\.(\d{1,3}|\*)$/;
    if (scope === "specific" && !ipRegex.test(pattern.trim())) return "Invalid IP format (e.g., 192.168.1.1)";
    if (scope === "wildcard" && !(cidrRegex.test(pattern.trim()) || wildcardRegex.test(pattern.trim())))
      return "Wildcards/CIDR expected (e.g., 192.168.*.* or 192.168.1.0/24)";
    return null;
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    try {
      await onSubmit({
        pattern: pattern.trim(),
        type: action,
        description: description.trim(),
        active,
      });
    } catch (err: any) {
      setError(err?.message ?? "An error occurred");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-2">
        <Label>Action</Label>
        <Select value={action} onValueChange={(v: any) => setAction(v as IpRuleAction)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DENY">Deny (block)</SelectItem>
            <SelectItem value="ALLOW">Allow (whitelist)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Choose whether this rule denies or allows matching IPs.</p>
      </div>

      <div className="grid gap-2">
        <Label>Pattern Type</Label>
        <Select value={scope} onValueChange={(v: any) => setScope(v as IpRuleScope)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="specific">Specific IP</SelectItem>
            <SelectItem value="wildcard">Wildcard / CIDR Range</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Specific for a single IP (e.g. 192.168.1.1). Wildcard allows 192.168.*.* or CIDR (192.168.1.0/24).
        </p>
      </div>

      <div className="grid gap-2">
        <Label>{scope === "specific" ? "IP Address" : "IP Range (wildcard or CIDR)"}</Label>
        <Input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder={scope === "specific" ? "192.168.1.1" : "192.168.*.* or 192.168.1.0/24"}
        />
      </div>

      <div className="grid gap-2">
        <Label>Description / Reason</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>

      <div className="flex items-center justify-between">
        <Label>Active</Label>
        <Switch checked={active} onCheckedChange={(v: boolean) => setActive(v)} />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (isEditing ? "Updating..." : "Saving...") : isEditing ? "Update Rule" : "Create Rule"}
      </Button>
    </form>
  );
}
