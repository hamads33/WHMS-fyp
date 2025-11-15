"use client";
console.log("ENV → ", process.env.NEXT_PUBLIC_API_URL);

import { useState } from "react";
import { apiGet } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

interface WhoisInfo {
  domain: string;
  registrar: string;
  created: string;
  expires: string;
  status: string;
  nameServers: string[];
}

export default function WhoisCard() {
  const [domain, setDomain] = useState("");
  const [whoisData, setWhoisData] = useState<WhoisInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setWhoisData(null);

    // Clean domain
    const cleanDomain = domain
      .trim()
      .replace("https://", "")
      .replace("http://", "")
      .replace("www.", "")
      .split("/")[0];

    try {
      const response = await apiGet(`/domains/whois?domain=${cleanDomain}`);

      if (!response.success) {
        setError(response.error || "WHOIS lookup failed");
        setLoading(false);
        return;
      }

      const parsed = response.data.parsed;

      const info: WhoisInfo = {
        domain: cleanDomain,
        registrar: parsed.registrar || "Unknown",
        created: parsed.created || "N/A",
        expires: parsed.expires || "N/A",
        status: parsed.status || "unknown",
        nameServers: parsed.nameServers || []
      };

      setWhoisData(info);

    } catch (err) {
      console.error(err);
      setError("Network error — check backend URL or CORS");
    }

    setLoading(false);
  }

  return (
    <div className="flex items-center justify-center py-10">
      <Card className="w-[450px] max-w-full rounded-xl shadow-lg border flex flex-col">
        <CardHeader className="border-b pb-4 mb-2">
          <CardTitle>WHOIS Lookup</CardTitle>
          <CardDescription>
            Enter a domain name to get registration details.
          </CardDescription>

          <form onSubmit={handleSubmit} className="pt-4 space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                type="text"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={loading || !domain} className="w-full">
              {loading ? "Searching..." : "Search"}
            </Button>
          </form>
        </CardHeader>

        <CardContent />

        <CardFooter className="border-t pt-4 flex flex-col items-start w-full">
          {error && <p className="text-red-500 text-sm pb-4">{error}</p>}

          {!whoisData && !error && (
            <p className="text-muted-foreground text-sm pb-4">
              Results will appear here...
            </p>
          )}

          {whoisData && (
            <div className="w-full bg-muted rounded-lg p-4 shadow-sm">
              <div className="text-lg font-semibold mb-3">
                WHOIS Info:{" "}
                <span className="text-primary font-bold">{whoisData.domain}</span>
              </div>

              <dl className="divide-y divide-border">
                <Detail label="Registrar" value={whoisData.registrar} />
                <Detail label="Created" value={whoisData.created} />
                <Detail label="Expires" value={whoisData.expires} />
                <Detail
                  label="Status"
                  value={
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        whoisData.status === "active"
                          ? "bg-green-200 text-green-800"
                          : "bg-yellow-200 text-yellow-800"
                      }`}
                    >
                      {whoisData.status}
                    </span>
                  }
                />

                <div className="py-2 grid grid-cols-3 gap-2">
                  <dt className="font-medium text-muted-foreground">Name Servers</dt>
                  <dd className="col-span-2">
                    <ul className="list-disc pl-5 space-y-1">
                      {whoisData.nameServers.map((ns) => (
                        <li key={ns} className="font-mono text-sm">
                          {ns}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div className="py-2 grid grid-cols-3 gap-2">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 truncate">{value}</dd>
    </div>
  );
}
