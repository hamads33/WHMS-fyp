"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import MarketplaceAPI from "@/lib/api/marketplace";

/**
 * Auto-generated settings form for a plugin's configSchema.
 *
 * Supported field types: text | password | select | toggle | number
 *
 * Each field in configSchema:
 *   { key, label, type, required?, placeholder?, description?, options?, default? }
 */
export default function PluginConfigPanel({ pluginName, displayName, configSchema }) {
  const { toast }       = useToast();
  const [config, setConfig] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    MarketplaceAPI.getPluginConfig(pluginName)
      .then(data => setConfig(data ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pluginName]);

  function set(key, value) {
    setConfig(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await MarketplaceAPI.updatePluginConfig(pluginName, config);
      toast({ title: "Settings saved", description: `${displayName} configuration updated.` });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{displayName} Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{displayName} Settings</CardTitle>
        <CardDescription>
          Configure credentials and options for {displayName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {configSchema.map(field => (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={`pcfg-${pluginName}-${field.key}`}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>

            {field.type === "select" ? (
              <Select
                value={config[field.key] ?? field.default ?? ""}
                onValueChange={v => set(field.key, v)}
              >
                <SelectTrigger id={`pcfg-${pluginName}-${field.key}`}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.type === "toggle" ? (
              <div className="flex items-center gap-2 pt-1">
                <Switch
                  id={`pcfg-${pluginName}-${field.key}`}
                  checked={!!config[field.key]}
                  onCheckedChange={v => set(field.key, v)}
                />
                <span className="text-sm text-muted-foreground">
                  {config[field.key] ? "Enabled" : "Disabled"}
                </span>
              </div>
            ) : (
              <Input
                id={`pcfg-${pluginName}-${field.key}`}
                type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
                value={config[field.key] ?? ""}
                onChange={e => set(field.key, e.target.value)}
                placeholder={field.placeholder ?? ""}
              />
            )}

            {field.description && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
          </div>
        ))}

        <Button onClick={handleSave} disabled={saving} className="mt-2">
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
