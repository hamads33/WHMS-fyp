"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function NameserversPage() {
  const { id } = useParams();
  const [nameservers, setNs] = useState<string[]>([]);
  const [newNs, setNewNs] = useState("");

  async function load() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/domains/${id}`);
    const json = await res.json();
    if (json.success) setNs(json.data.nameservers || []);
  }

  async function save() {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/domains/${id}/nameservers`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nameservers }),
    });
    load();
  }

  useEffect(() => {
    load();
  }, []);

  function addNs() {
    if (!newNs) return;
    setNs([...nameservers, newNs]);
    setNewNs("");
  }

  function removeNs(idx: number) {
    setNs(nameservers.filter((_, i) => i !== idx));
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold">Nameservers</h2>

      <Card>
        <CardHeader>
          <CardTitle>Edit Nameservers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="flex gap-2 max-w-md">
            <Input
              placeholder="ns1.example.com"
              value={newNs}
              onChange={(e) => setNewNs(e.target.value)}
            />
            <Button onClick={addNs}>Add</Button>
          </div>

          <div className="space-y-2">
            {nameservers.map((ns, idx) => (
              <div key={idx} className="flex justify-between border p-2 rounded">
                <span>{ns}</span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => removeNs(idx)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <Button onClick={save}>Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
