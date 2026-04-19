"use client"

import { useEffect, useState } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"
import { AdminBillingAPI } from "@/lib/api/billing"
import { TrendingUp } from "lucide-react"

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500 dark:text-gray-400">{p.name}:</span>
          <span className="font-semibold text-gray-800 dark:text-gray-100">
            {p.dataKey === "revenue"
              ? `$${Number(p.value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function RevenueChart({ months = 6 }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    AdminBillingAPI.getRevenueTrend(months)
      .then(res => { if (res.success && res.data) setData(res.data); setError(null) })
      .catch(err => { setError(err.message); setData([]) })
      .finally(() => setLoading(false))
  }, [months])

  const total = data.reduce((s, d) => s + Number(d.revenue || 0), 0)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Revenue Trend</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {loading ? <span className="inline-block h-7 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /> :
              `$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Past {months} months</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary border border-border">
          <TrendingUp className="h-5 w-5 text-foreground" />
        </div>
      </div>

      {loading ? (
        <div className="h-52 rounded-xl bg-gray-50 dark:bg-gray-800 animate-pulse" />
      ) : error || data.length === 0 ? (
        <div className="flex items-center justify-center h-52 text-sm text-gray-400">
          {error ? "Failed to load chart data" : "No revenue data yet"}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e5e7eb", strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#revGrad)"
              dot={false}
              activeDot={{ r: 5, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
