"use client"
import { LogOut, Menu, X, Server, Users, BarChart3, Settings } from "lucide-react"
import { useState } from "react"

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "w-64" : "w-20"} border-r border-border transition-all duration-300 flex flex-col`}
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className={`flex items-center gap-2 ${!sidebarOpen && "justify-center w-full"}`}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">W</span>
            </div>
            {sidebarOpen && <span className="font-bold">WHMS</span>}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { icon: BarChart3, label: "Dashboard", active: true },
            { icon: Server, label: "Servers" },
            { icon: Users, label: "Customers" },
            { icon: Settings, label: "Settings" },
          ].map((item, idx) => (
            <button
              key={idx}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                item.active ? "bg-accent text-primary-foreground" : "text-muted-foreground hover:bg-border"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <button className="w-full flex items-center gap-3 px-4 py-2 text-muted-foreground hover:bg-border rounded-lg transition-all">
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-border rounded-lg transition-all"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center text-primary-foreground font-bold">
              JD
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome back, John</h1>
              <p className="text-muted-foreground">Here's what's happening with your hosting infrastructure</p>
            </div>

            {/* Stats Grid */}
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { label: "Active Servers", value: "1,234", change: "+12%" },
                { label: "Total Customers", value: "5,678", change: "+8%" },
                { label: "Revenue (MTD)", value: "$45,230", change: "+23%" },
                { label: "Uptime", value: "99.98%", change: "+0.02%" },
              ].map((stat, idx) => (
                <div key={idx} className="p-6 border border-border rounded-lg">
                  <p className="text-muted-foreground text-sm mb-2">{stat.label}</p>
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-bold">{stat.value}</span>
                    <span className="text-accent text-sm font-medium">{stat.change}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="border border-border rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {[
                  { action: "New customer signup", time: "2 hours ago" },
                  { action: "Server maintenance completed", time: "4 hours ago" },
                  { action: "Backup completed successfully", time: "6 hours ago" },
                  { action: "New domain registered", time: "8 hours ago" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0"
                  >
                    <span className="text-foreground">{item.action}</span>
                    <span className="text-muted-foreground text-sm">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
