"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import {
  Plus,
  Play,
  Trash2,
  Eye,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Timer,
  RotateCcw,
} from "lucide-react"
import { AutomationAPI } from "@/lib/api/automation"
import { ConfirmDialog } from "@/components/automation/confirm-dialog"

/* ── Cron description helpers ── */
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function describeCron(cron) {
  if (!cron?.trim()) return null
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return null
  const [min, hr, dom, , dow] = parts
  if (min === "*" && hr === "*") return "Every minute"
  if (hr === "*" && min !== "*") return `Every hour at :${min.padStart(2, "0")}`
  if (dom === "*" && dow === "*" && hr !== "*") return `Daily at ${fmtTime(hr, min)}`
  if (dom === "*" && dow !== "*" && hr !== "*") return `Every ${DAYS[Number(dow)] || dow} at ${fmtTime(hr, min)}`
  if (dow === "*" && dom !== "*" && hr !== "*") return `${ordinal(Number(dom))} of month at ${fmtTime(hr, min)}`
  return null
}

function fmtTime(hr, min) {
  const h = Number(hr), m = String(min).padStart(2, "0")
  if (h === 0) return `12:${m} AM`
  if (h < 12) return `${h}:${m} AM`
  if (h === 12) return `12:${m} PM`
  return `${h - 12}:${m} PM`
}

function ordinal(n) {
  const s = ["th","st","nd","rd"]
  const v = n % 100
  return n + (s[(v-20)%10] || s[v] || s[0])
}

function getNextRun(cron) {
  if (!cron?.trim()) return null
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return null
  const [minStr, hrStr, domStr, , dowStr] = parts
  const now = new Date()
  try {
    const targetMin = minStr === "*" ? 0 : Number(minStr)
    if (hrStr === "*") {
      const next = new Date(now)
      next.setMinutes(targetMin, 0, 0)
      if (next <= now) next.setHours(next.getHours() + 1)
      return next
    }
    const targetHr = Number(hrStr)
    if (domStr === "*" && dowStr === "*") {
      const next = new Date(now)
      next.setHours(targetHr, targetMin, 0, 0)
      if (next <= now) next.setDate(next.getDate() + 1)
      return next
    }
    if (domStr === "*" && dowStr !== "*") {
      const targetDay = Number(dowStr)
      const next = new Date(now)
      next.setHours(targetHr, targetMin, 0, 0)
      let daysAhead = targetDay - next.getDay()
      if (daysAhead < 0 || (daysAhead === 0 && next <= now)) daysAhead += 7
      next.setDate(next.getDate() + daysAhead)
      return next
    }
    if (dowStr === "*" && domStr !== "*") {
      const next = new Date(now)
      next.setDate(Number(domStr))
      next.setHours(targetHr, targetMin, 0, 0)
      if (next <= now) next.setMonth(next.getMonth() + 1)
      return next
    }
  } catch { return null }
  return null
}

function formatNextRun(date) {
  if (!date) return null
  const now = new Date()
  const diffHrs = (date - now) / (1000 * 60 * 60)
  let relative = ""
  if (diffHrs < 1) relative = "< 1 hour"
  else if (diffHrs < 24) relative = `~${Math.round(diffHrs)}h`
  else { const d = Math.round(diffHrs / 24); relative = d === 1 ? "tomorrow" : `${d} days` }
  return `${relative} — ${date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at ${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
}

/* Route: app/(admin)/admin/automation/page.jsx */

const normalizeProfiles = (data = []) =>
  data.map((p) => ({
    id: p.id,
    name: p.name,
    cron: p.cron,
    enabled: Boolean(p.enabled),
    taskCount: p.taskCount ?? 0,
    lastRunStatus: p.lastRunStatus ?? null,
    lastRunAt: p.lastRunAt ?? null,
  }))

const StatusBadge = ({ enabled }) => (
  <Badge
    className={
      enabled
        ? "border-border text-foreground bg-secondary font-medium"
        : "border-border text-muted-foreground font-medium"
    }
    variant="outline"
  >
    <span
      className={`mr-1.5 inline-block w-1.5 h-1.5 rounded-full ${
        enabled ? "bg-foreground" : "bg-muted-foreground"
      }`}
    />
    {enabled ? "Enabled" : "Disabled"}
  </Badge>
)

const LastRunBadge = ({ status }) => {
  if (!status) return <span className="text-muted-foreground text-xs">Never run</span>

  const config = {
    success: {
      className: "border-border text-foreground",
      icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
    },
    failed: {
      className: "border-destructive/30 bg-destructive/10 text-destructive",
      icon: <XCircle className="w-3 h-3 mr-1" />,
    },
    running: {
      className: "border-border text-foreground",
      icon: <RotateCcw className="w-3 h-3 mr-1 animate-spin" />,
    },
    pending: {
      className: "border-border text-muted-foreground",
      icon: <Clock className="w-3 h-3 mr-1" />,
    },
  }

  const { className, icon } = config[status] ?? {
    className: "border-border text-muted-foreground",
    icon: null,
  }

  return (
    <Badge className={`${className} font-medium flex items-center`} variant="outline">
      {icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

function StatCard({ label, value, icon: Icon, iconClass }) {
  return (
    <Card className="flex-1">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
              {label}
            </p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconClass}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AutomationPage() {
  const [profiles, setProfiles] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    let active = true

    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const profilesRes = await AutomationAPI.listProfiles()
        if (!active) return
        setProfiles(normalizeProfiles(profilesRes?.data ?? []))
      } catch {
        if (active) setError("Failed to load automations")
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()
    return () => {
      active = false
    }
  }, [])

  const handleToggleStatus = async (profile) => {
    try {
      if (profile.enabled) {
        await AutomationAPI.disableProfile(profile.id)
      } else {
        await AutomationAPI.enableProfile(profile.id)
      }

      const res = await AutomationAPI.listProfiles()
      setProfiles(normalizeProfiles(res?.data ?? []))
    } catch (err) {
      console.error("Failed to toggle status:", err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await AutomationAPI.deleteProfile(id)
      setProfiles((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      console.error("Failed to delete profile:", err)
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleRun = async (id) => {
    try {
      await AutomationAPI.runProfile(id)
    } catch (err) {
      console.error("Failed to run profile:", err)
    }
  }

  /* Derived stats */
  const enabledCount = profiles.filter((p) => p.enabled).length
  const failedCount = profiles.filter((p) => p.lastRunStatus === "failed").length

  /* Loading state */
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-9 w-36" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="flex gap-4 mb-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="flex-1">
                <CardContent className="pt-5 pb-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-7 w-12" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-5 w-40 mb-3" />
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* Error state */
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-sm w-full mx-4">
          <CardContent className="pt-8 pb-8 text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="font-semibold text-foreground mb-1">Failed to Load</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Automation Profiles</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage and monitor your automation workflows
            </p>
          </div>
          <Link href="/admin/automation/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Profile
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Templates Shortcut */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground mb-1">Get Started Quickly</p>
              <p className="text-sm text-muted-foreground">Browse preset automation templates to handle common tasks</p>
            </div>
            <Link href="/admin/automation/templates">
              <Button variant="default" size="sm">
                <Zap className="w-4 h-4 mr-2" />
                Explore Templates
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="flex gap-4 mb-8">
          <StatCard
            label="Total Profiles"
            value={profiles.length}
            icon={Zap}
            iconClass="bg-secondary text-foreground border border-border"
          />
          <StatCard
            label="Enabled"
            value={enabledCount}
            icon={CheckCircle2}
            iconClass="bg-secondary text-foreground border border-border"
          />
          <StatCard
            label="Last Run Failed"
            value={failedCount}
            icon={AlertCircle}
            iconClass={failedCount > 0 ? "bg-destructive/10 text-destructive border border-destructive/30" : "bg-secondary text-muted-foreground border border-border"}
          />
        </div>
        {/* Empty State */}
        {profiles.length === 0 && (
          <Card className="py-20 text-center">
            <CardContent>
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No automation profiles yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                Create your first automation profile to start scheduling and running automated tasks.
              </p>
              <Link href="/admin/automation/new">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Profile Cards Grid */}
        {profiles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <Card
                key={profile.id}
                className="group hover:shadow-md transition-all duration-200 hover:border-primary/30 flex flex-col"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base leading-tight truncate">
                        {profile.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {describeCron(profile.cron) || (
                          <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{profile.cron}</code>
                        )}
                      </p>
                    </div>
                    <StatusBadge enabled={profile.enabled} />
                  </div>
                </CardHeader>

                <CardContent className="pt-0 flex-1 flex flex-col gap-3">
                  {/* Task Count + Last Run */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      {profile.taskCount} {profile.taskCount === 1 ? "task" : "tasks"}
                    </span>
                    <LastRunBadge status={profile.lastRunStatus} />
                  </div>

                  {/* Last Run Time */}
                  {profile.lastRunAt && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Timer className="w-3 h-3" />
                      Last: {new Date(profile.lastRunAt).toLocaleString()}
                    </div>
                  )}

                  {/* Next Run Preview */}
                  {profile.enabled && (() => {
                    const nextRunDate = getNextRun(profile.cron)
                    const text = formatNextRun(nextRunDate)
                    return text ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <Clock className="w-3 h-3" />
                        Next: {text}
                      </div>
                    ) : null
                  })()}

                  {/* Divider + Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t mt-auto">
                    {/* View */}
                    <Link href={`/admin/automation/${profile.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </Button>
                    </Link>

                    {/* Run */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRun(profile.id)}
                      disabled={!profile.enabled}
                      title={profile.enabled ? "Run profile" : "Enable profile to run"}
                      className="gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Run
                    </Button>

                    {/* Toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(profile)}
                      title={profile.enabled ? "Disable profile" : "Enable profile"}
                      className="text-muted-foreground hover:text-foreground px-2"
                    >
                      {profile.enabled ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </Button>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(profile)}
                      title="Delete profile"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete automation profile?"
        description={`"${deleteTarget?.name || ""}" and all its tasks will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete Profile"
        onConfirm={() => handleDelete(deleteTarget?.id)}
      />
    </div>
  )
}
