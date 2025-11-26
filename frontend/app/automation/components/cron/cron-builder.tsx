"use client";

import { useState, useEffect } from "react";
import CronPreview from "./cron-preview";
import { validateCron } from "@/app/automation/lib/cron-utils";

export default function CronBuilder({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [mode, setMode] = useState("simple");
  const [minute, setMinute] = useState("*/5");
  const [hour, setHour] = useState("*");
  const [dom, setDom] = useState("*");
  const [mon, setMon] = useState("*");
  const [dow, setDow] = useState("*");

  useEffect(() => {
    if (mode === "simple") {
      const expr = `${minute} ${hour} ${dom} ${mon} ${dow}`;
      onChange(expr);
    }
  }, [minute, hour, dom, mon, dow, mode]);

  return (
    <div className="border p-3 rounded bg-white">
      {/* MODE SWITCH */}
      <div className="flex gap-3 mb-3">
        <button
          className={`px-3 py-1 rounded ${
            mode === "simple"
              ? "bg-blue-500 text-white"
              : "bg-gray-200"
          }`}
          onClick={() => setMode("simple")}
        >
          Simple
        </button>

        <button
          className={`px-3 py-1 rounded ${
            mode === "advanced"
              ? "bg-blue-500 text-white"
              : "bg-gray-200"
          }`}
          onClick={() => setMode("advanced")}
        >
          Advanced
        </button>
      </div>

      {/* SIMPLE MODE */}
      {mode === "simple" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Every X minutes:</label>
          <select
            className="border p-2 rounded w-full"
            value={minute}
            onChange={(e) => setMinute(e.target.value)}
          >
            <option value="*/1">Every minute</option>
            <option value="*/5">Every 5 minutes</option>
            <option value="*/10">Every 10 minutes</option>
            <option value="*/30">Every 30 minutes</option>
          </select>
        </div>
      )}

      {/* ADVANCED MODE */}
      {mode === "advanced" && (
        <div className="grid grid-cols-5 gap-2 mt-2">
          <input
            className="border p-2"
            placeholder="min"
            value={minute}
            onChange={(e) => onChange(`${e.target.value} ${hour} ${dom} ${mon} ${dow}`)}
          />
          <input
            className="border p-2"
            placeholder="hour"
            value={hour}
            onChange={(e) => onChange(`${minute} ${e.target.value} ${dom} ${mon} ${dow}`)}
          />
          <input
            className="border p-2"
            placeholder="dom"
            value={dom}
            onChange={(e) => onChange(`${minute} ${hour} ${e.target.value} ${mon} ${dow}`)}
          />
          <input
            className="border p-2"
            placeholder="mon"
            value={mon}
            onChange={(e) => onChange(`${minute} ${hour} ${dom} ${e.target.value} ${dow}`)}
          />
          <input
            className="border p-2"
            placeholder="dow"
            value={dow}
            onChange={(e) => onChange(`${minute} ${hour} ${dom} ${mon} ${e.target.value}`)}
          />
        </div>
      )}

      <CronPreview value={value} />
    </div>
  );
}
