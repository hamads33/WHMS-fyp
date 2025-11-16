"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

export default function DomainLogsPage() {
  const { id } = useParams();
  const [logs, setLogs] = useState([]);

  async function load() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/domains/${id}/logs`);
    const json = await res.json();
    if (json.success) setLogs(json.data);
  }

  useEffect(() => load(), []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Domain Logs</h1>

      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>{log.createdAt.slice(0, 19).replace("T", " ")}</TableCell>
              <TableCell>{log.action}</TableCell>
              <TableCell>{log.message || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
