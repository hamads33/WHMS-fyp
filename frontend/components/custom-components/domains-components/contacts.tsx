"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

export default function ContactsPage() {
  const { id } = useParams();
  const [contacts, setContacts] = useState<any>({
    registrant: {},
    admin: {},
    tech: {},
    billing: {},
  });

  async function load() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/domains/${id}`);
    const json = await res.json();
    if (json.success) setContacts(json.data.contacts || contacts);
  }

  async function save() {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/domains/${id}/contacts`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contacts),
    });
  }

  useEffect(() => load(), []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Domain Contacts</h1>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {Object.keys(contacts).map((section) => (
          <Card key={section}>
            <CardHeader>
              <CardTitle className="capitalize">{section} Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">

              <Textarea
                rows={8}
                value={JSON.stringify(contacts[section], null, 2)}
                onChange={(e) =>
                  setContacts({
                    ...contacts,
                    [section]: JSON.parse(e.target.value || "{}"),
                  })
                }
              />

            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={save}>Save All Contacts</Button>
    </div>
  );
}
