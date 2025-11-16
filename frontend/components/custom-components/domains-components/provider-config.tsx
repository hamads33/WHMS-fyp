"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProviderConfigPage() {
  const [config, setConfig] = useState<any>({ key: "", secret: "" });

  async function load() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/domains/providers`);
    const json = await res.json();
    if (json.success) setConfig(json.data || {});
  }

  async function save() {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/domains/providers`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
  }

  useEffect(() => load(), []);

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold">Domain Provider Configuration</h1>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Porkbun Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Porkbun API Key"
            value={config.key}
            onChange={(e) => setConfig({ ...config, key: e.target.value })}
          />
          <Input
            placeholder="Porkbun Secret Key"
            value={config.secret}
            onChange={(e) => setConfig({ ...config, secret: e.target.value })}
          />

          <Button onClick={save}>Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
