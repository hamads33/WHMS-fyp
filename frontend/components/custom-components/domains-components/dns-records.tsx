"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

export default function DNSPage() {
  const { id } = useParams();
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({ type: "A", name: "", value: "" });

  async function load() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/domains/${id}/dns`);
    const json = await res.json();
    if (json.success) setRecords(json.data);
  }

  async function addRecord() {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/domains/${id}/dns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold">DNS Records</h2>

      <div className="grid grid-cols-3 gap-2 max-w-lg">
        <Input placeholder="Type (A, CNAME...)" value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })} />
        <Input placeholder="Name (@, www)" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Value" value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })} />
      </div>

      <Button onClick={addRecord}>Add Record</Button>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map(r => (
            <TableRow key={r.id}>
              <TableCell>{r.type}</TableCell>
              <TableCell>{r.name}</TableCell>
              <TableCell>{r.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
