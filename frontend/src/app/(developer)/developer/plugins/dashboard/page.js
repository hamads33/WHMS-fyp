
// ========================================
// FILE: src/app/(developer)/developer/plugins/dashboard/page.js
// ========================================
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Bell, ChevronDown, Download, Eye, MoreHorizontal, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { usePlugins } from "@/hooks/usePlugins"
import { PluginsAPI } from "@/lib/api/plugins"
import { useToast } from "@/hooks/useToast"
import { formatNumber } from "@/lib/utils"

function StatCard({ stat }) {
  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className={`w-4 h-4 ${stat.trendUp ? 'text-chart-1' : 'text-muted-foreground'}`} />
              <span className={`text-xs font-medium ${stat.trendUp ? "text-chart-1" : "text-muted-foreground"}`}>
                {stat.trend}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DeveloperDashboard() {
  const { plugins, loading, error, stats, refetch, deletePlugin, publishPlugin } = usePlugins()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [chartData, setChartData] = useState([])
  const [activities, setActivities] = useState([])
  const { toast } = useToast()

  useEffect(() => {
    async function fetchChartData() {
      try {
        const data = await PluginsAPI.getStats("all")
        setChartData(data.downloadTrend || [])
      } catch (err) {
        console.error("Failed to fetch chart data:", err)
      }
    }
    
    if (plugins.length > 0) {
      fetchChartData()
    }
  }, [plugins])

  const statsCards = [
    {
      label: "Total Downloads",
      value: formatNumber(stats?.totalDownloads || 0),
      trend: `+${stats?.downloadGrowth || 0}%`,
      trendUp: (stats?.downloadGrowth || 0) > 0,
    },
    {
      label: "Revenue",
      value: `$${(stats?.revenue || 0).toLocaleString()}`,
      trend: `+${stats?.revenueGrowth || 0}%`,
      trendUp: (stats?.revenueGrowth || 0) > 0,
    },
    {
      label: "Avg Rating",
      value: `${(stats?.avgRating || 0).toFixed(1)}/5`,
      trend: `+${(stats?.ratingGrowth || 0).toFixed(1)}`,
      trendUp: (stats?.ratingGrowth || 0) > 0,
    },
    {
      label: "Active Plugins",
      value: plugins.filter(p => p.status === "published").length.toString(),
      trend: "0%",
      trendUp: false,
    },
  ]

  const filteredPlugins = plugins.filter((plugin) => {
    const matchesSearch = plugin.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || plugin.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleDelete = async (pluginId) => {
    if (!confirm("Are you sure you want to delete this plugin?")) return

    const result = await deletePlugin(pluginId)
    if (result.success) {
      toast({
        title: "Plugin Deleted",
        description: "Plugin has been deleted successfully",
      })
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    }
  }

  const handlePublish = async (pluginId) => {
    const result = await publishPlugin(pluginId)
    if (result.success) {
      toast({
        title: "Plugin Published",
        description: "Plugin is now live in the marketplace",
      })
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    }
  }

  if (loading && plugins.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Plugin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your plugins and track performance</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/marketplace">
              <Button variant="outline">View Marketplace</Button>
            </Link>
            <button className="relative p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
              <Bell className="w-5 h-5 text-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-chart-1 flex items-center justify-center text-xs font-bold text-white">
                    JD
                  </div>
                  <ChevronDown className="w-4 h-4 text-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>Profile Settings</DropdownMenuItem>
                <DropdownMenuItem>API Keys</DropdownMenuItem>
                <DropdownMenuItem>Billing</DropdownMenuItem>
                <DropdownMenuItem>Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {error && (
          <Card className="border-destructive bg-destructive/10 p-4">
            <p className="text-destructive">Error: {error}</p>
            <Button variant="outline" className="mt-4" onClick={refetch}>
              Retry
            </Button>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat, idx) => (
            <StatCard key={idx} stat={stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="col-span-2 bg-card">
            <CardHeader>
              <CardTitle>Downloads Trend</CardTitle>
              <CardDescription>Last 6 weeks</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
                    <YAxis stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="downloads"
                      stroke="var(--chart-1)"
                      dot={{ fill: "var(--chart-1)", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No chart data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.length > 0 ? (
                  activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                      <div className="w-8 h-8 rounded-full bg-chart-1/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="w-2 h-2 bg-chart-1 rounded-full"></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{activity.plugin}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Plugins</CardTitle>
                <CardDescription>Manage and monitor your published plugins</CardDescription>
              </div>
              <Link href="/developer/plugins/upload">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  + Upload Plugin
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <Input
                  placeholder="Search plugins..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredPlugins.length > 0 ? (
              <>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-foreground font-semibold">Plugin Name</TableHead>
                        <TableHead className="text-foreground font-semibold">Status</TableHead>
                        <TableHead className="text-foreground font-semibold text-right">Downloads</TableHead>
                        <TableHead className="text-foreground font-semibold text-right">Rating</TableHead>
                        <TableHead className="text-foreground font-semibold">Updated</TableHead>
                        <TableHead className="text-foreground font-semibold w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlugins.map((plugin) => (
                        <TableRow key={plugin.id} className="border-border hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium text-foreground">{plugin.name}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                plugin.status === "published"
                                  ? "bg-chart-1/20 text-chart-1 border-chart-1/30"
                                  : "bg-muted text-muted-foreground border-border"
                              }
                            >
                              {plugin.status.charAt(0).toUpperCase() + plugin.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-foreground">
                            {formatNumber(plugin.downloads || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {plugin.rating ? (
                              <div className="flex items-center justify-end gap-1">
                                <span className="font-medium text-foreground">{plugin.rating}</span>
                                <span className="text-muted-foreground text-sm">★</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(plugin.updatedAt || plugin.updated).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 hover:bg-muted rounded transition-colors">
                                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/developer/plugins/${plugin.id}/edit`}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Edit Plugin
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/marketplace/${plugin.slug || plugin.id}`}>
                                    <Download className="w-4 h-4 mr-2" />
                                    View in Marketplace
                                  </Link>
                                </DropdownMenuItem>
                                {plugin.status === "draft" && (
                                  <DropdownMenuItem onClick={() => handlePublish(plugin.id)}>
                                    Publish
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleDelete(plugin.id)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Showing {filteredPlugins.length} of {plugins.length} plugins</span>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== "all" 
                    ? "No plugins match your filters" 
                    : "You haven't created any plugins yet"}
                </p>
                {!searchTerm && statusFilter === "all" && (
                  <Link href="/developer/plugins/upload">
                    <Button>Create Your First Plugin</Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}