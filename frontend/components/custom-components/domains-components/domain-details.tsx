"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DomainDetailsPage() {
  const { id } = useParams();
  const [domain, setDomain] = useState(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/domains/${id}`);
      const json = await res.json();
      if (json.success) setDomain(json.data);
    }
    load();
  }, [id]);

  if (!domain) return <p className="p-6">Loading...</p>;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold">{domain.name}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Domain Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p><strong>Status:</strong> {domain.status}</p>
          <p><strong>Expiry:</strong> {domain.expiryDate?.slice(0, 10)}</p>
          <p><strong>Provider:</strong> {domain.provider}</p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Link href={`/domains/dns/${id}`}><Button>DNS Records</Button></Link>
        <Link href={`/domains/nameservers/${id}`}><Button>Nameservers</Button></Link>
        <Link href={`/domains/contacts/${id}`}><Button>Contacts</Button></Link>
        <Link href={`/domains/logs/${id}`}><Button>Logs</Button></Link>
      </div>
    </div>
  );
}
