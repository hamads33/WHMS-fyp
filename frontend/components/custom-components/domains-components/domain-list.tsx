"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Globe } from "lucide-react";

export default function DomainListPage() {
  const [domains, setDomains] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadDomains() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/domains`);
      const json = await res.json();
      if (json.success) setDomains(json.data);
    } catch (err) {
      console.error("Failed loading domains", err);
    }
    setLoading(false);
  }

  useEffect(() => { loadDomains(); }, []);

  const filtered = domains.filter((d: any) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  function statusBadge(status: string) {
    switch (status?.toLowerCase()) {
      case "active":
        return <Badge className="bg-green-600">Active</Badge>;
      case "expired":
        return <Badge className="bg-red-600">Expired</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500 text-black">Pending</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  }

  return (
    <div className="p-6 space-y-6">

      {/* PAGE HEADER */}
      <Card className="border border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Globe className="w-6 h-6 text-primary" />
            Domain Management
          </CardTitle>
        </CardHeader>

        {/* SEARCH BAR */}
        <CardContent>
          <div className="flex items-center gap-3 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search domain..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MAIN TABLE CARD */}
      <Card className="shadow-sm border border-primary/10">
        <CardContent className="p-0">

          {/* LOADING SKELETON */}
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <>
              {/* EMPTY STATE */}
              {filtered.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground text-sm">
                  No domains found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Domain</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Expiry</TableHead>
                      <TableHead className="font-semibold">Provider</TableHead>
                      <TableHead className="text-right font-semibold">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filtered.map((d: any) => (
                      <TableRow
                        key={d.id}
                        className="hover:bg-muted/40 transition-colors"
                      >
                        <TableCell className="font-medium">{d.name}</TableCell>

                        <TableCell>{statusBadge(d.status)}</TableCell>

                        <TableCell>
                          {d.expiryDate ? d.expiryDate.slice(0, 10) : "N/A"}
                        </TableCell>

                        <TableCell>
                          {d.provider ? (
                            <Badge variant="outline" className="text-primary border-primary">
                              {d.provider}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <Link href={`/domains/${d.id}`}>
                            <Button size="sm" variant="secondary">
                              Manage
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
