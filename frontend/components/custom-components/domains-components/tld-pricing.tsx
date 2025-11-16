"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface StoredTLD {
  id: number;
  name: string;
  registerPrice: number;
  renewPrice: number;
  transferPrice: number;
  markupPercent: number | null;
}

interface LivePB {
  registration: number | string;
  renewal: number | string;
  transfer: number | string;
}

const API = process.env.NEXT_PUBLIC_API_URL;

function centsToUsd(c: number | null | undefined) {
  if (!c || isNaN(c)) return null;
  return c / 100;
}

function safePB(v: any): number | null {
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export default function TLDPricingPage() {
  const [stored, setStored] = useState<StoredTLD[]>([]);
  const [live, setLive] = useState<Record<string, LivePB>>({});
  const [showLive, setShowLive] = useState(false);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "tld" | "register" | "renew" | "transfer" | "profit"
  >("tld");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [globalMarkupPercent, setGlobalMarkupPercent] = useState(10);

  // ALERT STATES
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  function showAlert(type: "success" | "error", title: string, message: string) {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 3000); // Auto hide alert
  }

  async function loadFromDB() {
    try {
      const res = await fetch(`${API}/domains/tlds`);
      const json = await res.json();
      if (json.success) setStored(json.data);
    } catch {
      showAlert("error", "Load Failed", "Could not load stored pricing.");
    }
  }

  async function refreshFromAPI() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/domains/pricing`);
      const json = await res.json();

      if (!json.success) showAlert("error", "API Error", json.error);
      else {
        setLive(json.data);
        setShowLive(true);
        showAlert("success", "Live Pricing Loaded", "Latest Porkbun pricing applied.");
      }
    } catch {
      showAlert("error", "Failed", "Could not fetch live Porkbun pricing.");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadFromDB();
  }, []);

  const rows = useMemo(() => {
    return stored.map((t) => {
      const livePB = live[t.name] || null;

      const storedRegister = centsToUsd(t.registerPrice);
      const storedRenew = centsToUsd(t.renewPrice);
      const storedTransfer = centsToUsd(t.transferPrice);

      const liveRegister = livePB ? safePB(livePB.registration) : null;
      const liveRenew = livePB ? safePB(livePB.renewal) : null;
      const liveTransfer = livePB ? safePB(livePB.transfer) : null;

      const register = showLive && liveRegister !== null ? liveRegister : storedRegister;
      const renew = showLive && liveRenew !== null ? liveRenew : storedRenew;
      const transfer = showLive && liveTransfer !== null ? liveTransfer : storedTransfer;

      const markedUp = register ? register * (1 + globalMarkupPercent / 100) : null;

      const profit =
        storedRegister !== null && markedUp !== null
          ? storedRegister - markedUp
          : null;

      return {
        name: t.name,
        storedRegister,
        storedRenew,
        storedTransfer,
        liveRegister,
        liveRenew,
        liveTransfer,
        finalRegister: register,
        finalRenew: renew,
        finalTransfer: transfer,
        markedUp,
        profit
      };
    });
  }, [stored, live, showLive, globalMarkupPercent]);

  const filtered = useMemo(() => {
    let r = [...rows];

    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter((x) => x.name.toLowerCase().includes(q));
    }

    const mul = sortDir === "asc" ? 1 : -1;

    r.sort((a, b) => {
      switch (sortBy) {
        case "register":
          return ((a.finalRegister || 0) - (b.finalRegister || 0)) * mul;
        case "renew":
          return ((a.finalRenew || 0) - (b.finalRenew || 0)) * mul;
        case "transfer":
          return ((a.finalTransfer || 0) - (b.finalTransfer || 0)) * mul;
        case "profit":
          return ((a.profit || 0) - (b.profit || 0)) * mul;
        default:
          return a.name.localeCompare(b.name) * mul;
      }
    });

    return r;
  }, [rows, query, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function saveTLD(name: string, price: number, markup: number) {
    try {
      const res = await fetch(`${API}/domains/tlds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          registerPrice: Math.round(price * 100),
          markupPercent: markup
        })
      });

      const json = await res.json();

      if (!json.success) {
        showAlert("error", "Save Error", json.error);
        return;
      }

      showAlert("success", "Saved!", "TLD pricing updated successfully.");
      loadFromDB();
    } catch {
      showAlert("error", "Save Failed", "Could not save pricing.");
    }
  }

  return (
    <div className="p-6 space-y-6">

      {/* ALERT BOX */}
      {alert && (
        <Alert
          className={`flex items-start gap-3 p-4 border ${
            alert.type === "success"
              ? "border-green-500 bg-green-50 text-green-800"
              : "border-red-500 bg-red-50 text-red-800"
          } animate-in fade-in slide-in-from-top-4 duration-300`}
        >
          {alert.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-600" />
          )}
          <div>
            <AlertTitle className="font-semibold">{alert.title}</AlertTitle>
            <AlertDescription>{alert.message}</AlertDescription>
          </div>
        </Alert>
      )}

      {/* GLOBAL MARKUP CARD */}
      <Card className="border border-primary/30">
        <CardHeader>
          <CardTitle className="font-semibold text-lg">Markup Settings</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <span className="font-medium">Global Markup (%)</span>
          <Input
            value={String(globalMarkupPercent)}
            onChange={(e) => setGlobalMarkupPercent(Number(e.target.value))}
            className="w-24"
          />
          <Button onClick={refreshFromAPI}>
            {loading ? "Loading..." : "Show Live Pricing"}
          </Button>

          <div className="flex items-center gap-2">
            <Switch checked={showLive} onCheckedChange={setShowLive} />
            <span className="text-sm">Use Live Prices</span>
          </div>
        </CardContent>
      </Card>

      {/* FILTER BAR */}
      <div className="flex gap-3 items-center">
        <Input
          placeholder="Search .com"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-60"
        />

        <Select onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tld">TLD</SelectItem>
            <SelectItem value="register">Register</SelectItem>
            <SelectItem value="renew">Renew</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
            <SelectItem value="profit">Profit</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
          {sortDir === "asc" ? "Asc" : "Desc"}
        </Button>
      </div>

      {/* TABLE */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>TLD</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>After Markup</TableHead>
              <TableHead>Profit</TableHead>
              <TableHead>Save</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {pageRows.map((r) => (
              <TableRow key={r.name}>
                <TableCell className="font-mono">{r.name}</TableCell>

                <TableCell>
                  {r.finalRegister !== null ? `$${r.finalRegister.toFixed(2)}` : "-"}
                </TableCell>

                <TableCell>
                  {r.markedUp !== null ? `$${r.markedUp.toFixed(2)}` : "-"}
                </TableCell>

                <TableCell
                  className={`font-bold ${
                    r.profit !== null && r.profit >= 0
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {r.profit !== null ? `$${r.profit.toFixed(2)}` : "-"}
                </TableCell>

                <TableCell>
                  <Button
                    size="sm"
                    onClick={() =>
                      saveTLD(
                        r.name,
                        r.markedUp || r.finalRegister || 0,
                        globalMarkupPercent
                      )
                    }
                  >
                    Save
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between items-center">
        <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
          Prev
        </Button>

        <span className="text-sm">
          Page {page} / {totalPages}
        </span>

        <Button disabled={page === totalPages} onClick={() => setPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
