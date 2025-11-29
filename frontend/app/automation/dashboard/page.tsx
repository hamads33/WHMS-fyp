"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { listProfiles } from "@/app/automation/api";
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

const COLORS = ["#60A5FA", "#34D399", "#FBBF24", "#F472B6"];

export default function DashboardPage() {
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles"], queryFn: () => listProfiles().then(r => r.data ?? []), refetchInterval: 15_000 });

  const totalProfiles = profiles.length;
  const enabledCount = profiles.filter((p:any)=>p.enabled).length;

  const pieData = [
    { name: "Enabled", value: enabledCount },
    { name: "Disabled", value: Math.max(0, totalProfiles - enabledCount) },
  ];

  // fake history for charts (you can replace with real endpoint)
  const recent = profiles.slice(0, 7).map((p:any, i:number) => ({ name: p.name || `P${i+1}`, value: Math.floor(Math.random()*5) }));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Automation Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4"><div className="text-sm">Profiles</div><div className="text-2xl font-bold">{totalProfiles}</div></Card>
        <Card className="p-4"><div className="text-sm">Enabled</div><div className="text-2xl font-bold">{enabledCount}</div></Card>
        <Card className="p-4"><div className="text-sm">Recent runs</div><div className="text-2xl font-bold">—</div></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} label>
                {pieData.map((entry, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={recent}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#60A5FA" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
