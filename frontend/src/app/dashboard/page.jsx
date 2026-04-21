"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WebsitesAPI } from "@/lib/api/websites";

function StatusBadge({ status }) {
  const map = {
    pending: "bg-yellow-100 text-yellow-800",
    active: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
        map[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWebsites = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await WebsitesAPI.list();
      setWebsites(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load websites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWebsites();
  }, []);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadWebsites}
            className="rounded-md border px-4 py-2 text-sm"
          >
            Refresh
          </button>
          <Link
            href="/create"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Create Website
          </Link>
        </div>
      </div>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <p>Loading websites...</p>
      ) : websites.length === 0 ? (
        <p>No websites yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Domain</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {websites.map((site) => (
                <tr key={site.id} className="border-t">
                  <td className="px-4 py-3">{site.domain}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={site.status} />
                  </td>
                  <td className="px-4 py-3">
                    {new Date(site.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
