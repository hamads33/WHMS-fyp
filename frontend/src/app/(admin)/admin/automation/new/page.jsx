"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { ArrowLeft, AlertCircle, Loader2, Timer, Zap, Clock, CalendarDays, ChevronDown, ChevronRight } from "lucide-react"
import { AutomationAPI } from "@/lib/api/automation"

/* Route: app/(admin)/admin/automation/new/page.jsx */

/* ── Schedule mode presets ── */
const SCHEDULE_MODES = [
  { value: "hourly",  label: "Hourly",  icon: Clock },
  { value: "daily",   label: "Daily",   icon: CalendarDays },
  { value: "weekly",  label: "Weekly",  icon: CalendarDays },
  { value: "monthly", label: "Monthly", icon: CalendarDays },
  { value: "custom",  label: "Custom",  icon: Timer },
]

const DAYS_OF_WEEK = [
  { value: "1", label: "Mon" },
  { value: "2", label: "Tue" },
  { value: "3", label: "Wed" },
  { value: "4", label: "Thu" },
  { value: "5", label: "Fri" },
  { value: "6", label: "Sat" },
  { value: "0", label: "Sun" },
]

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`,
}))

const MINUTES = [
  { value: "0", label: ":00" },
  { value: "15", label: ":15" },
  { value: "30", label: ":30" },
  { value: "45", label: ":45" },
]

/* ── Build cron from schedule config ── */
function buildCron(mode, hour, minute, dayOfWeek, dayOfMonth) {
  const m = minute || "0"
  const h = hour || "0"
  switch (mode) {
    case "hourly":  return `${m} * * * *`
    case "daily":   return `${m} ${h} * * *`
    case "weekly":  return `${m} ${h} * * ${dayOfWeek || "1"}`
    case "monthly": return `${m} ${h} ${dayOfMonth || "1"} * *`
    default:        return ""
  }
}

/* ── Human-readable description ── */
function describeCron(cron) {
  if (!cron?.trim()) return null
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return null

  const [min, hr, dom, , dow] = parts

  // Every minute
  if (min === "*" && hr === "*") return "Every minute"

  // Hourly
  if (hr === "*" && min !== "*") return `Every hour at :${min.padStart(2, "0")}`

  // Daily
  if (dom === "*" && dow === "*" && hr !== "*" && min !== "*") {
    return `Every day at ${formatTime(hr, min)}`
  }

  // Weekly
  if (dom === "*" && dow !== "*" && hr !== "*") {
    const dayName = DAYS_OF_WEEK.find(d => d.value === dow)?.label || `day ${dow}`
    return `Every ${dayName} at ${formatTime(hr, min)}`
  }

  // Monthly
  if (dow === "*" && dom !== "*" && hr !== "*") {
    const suffix = getOrdinal(Number(dom))
    return `${suffix} of every month at ${formatTime(hr, min)}`
  }

  return null
}

function formatTime(hr, min) {
  const h = Number(hr)
  const m = String(min).padStart(2, "0")
  if (h === 0) return `12:${m} AM`
  if (h < 12) return `${h}:${m} AM`
  if (h === 12) return `12:${m} PM`
  return `${h - 12}:${m} PM`
}

function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/* ── Compute next run from cron ── */
function getNextRun(cron) {
  if (!cron?.trim()) return null
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return null

  const [minStr, hrStr, domStr, , dowStr] = parts
  const now = new Date()

  // Simple next-run for common patterns
  try {
    if (hrStr === "*" && minStr === "*") {
      // every minute
      const next = new Date(now.getTime() + 60000)
      return next
    }

    const targetMin = minStr === "*" ? 0 : Number(minStr)

    if (hrStr === "*") {
      // hourly
      const next = new Date(now)
      next.setMinutes(targetMin, 0, 0)
      if (next <= now) next.setHours(next.getHours() + 1)
      return next
    }

    const targetHr = Number(hrStr)

    if (domStr === "*" && dowStr === "*") {
      // daily
      const next = new Date(now)
      next.setHours(targetHr, targetMin, 0, 0)
      if (next <= now) next.setDate(next.getDate() + 1)
      return next
    }

    if (domStr === "*" && dowStr !== "*") {
      // weekly
      const targetDay = Number(dowStr)
      const next = new Date(now)
      next.setHours(targetHr, targetMin, 0, 0)
      const currentDay = next.getDay()
      let daysAhead = targetDay - currentDay
      if (daysAhead < 0 || (daysAhead === 0 && next <= now)) daysAhead += 7
      next.setDate(next.getDate() + daysAhead)
      return next
    }

    if (dowStr === "*" && domStr !== "*") {
      // monthly
      const targetDom = Number(domStr)
      const next = new Date(now)
      next.setDate(targetDom)
      next.setHours(targetHr, targetMin, 0, 0)
      if (next <= now) next.setMonth(next.getMonth() + 1)
      return next
    }
  } catch {
    return null
  }

  return null
}

function formatNextRun(date) {
  if (!date) return null
  const now = new Date()
  const diffMs = date - now
  const diffHrs = diffMs / (1000 * 60 * 60)

  let relative = ""
  if (diffHrs < 1) relative = "in less than an hour"
  else if (diffHrs < 24) relative = `in ~${Math.round(diffHrs)} hours`
  else {
    const diffDays = Math.round(diffHrs / 24)
    relative = diffDays === 1 ? "tomorrow" : `in ${diffDays} days`
  }

  return `${relative} — ${date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} at ${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
}

export default function CreateProfilePage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    schedule: "",
  })

  const [scheduleMode, setScheduleMode] = useState("daily")
  const [hour, setHour] = useState("2")
  const [minute, setMinute] = useState("0")
  const [dayOfWeek, setDayOfWeek] = useState("1")
  const [dayOfMonth, setDayOfMonth] = useState("1")
  const [showAdvancedCron, setShowAdvancedCron] = useState(false)

  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Compute the cron expression from preset config
  const computedCron = useMemo(() => {
    if (scheduleMode === "custom") return formData.schedule
    return buildCron(scheduleMode, hour, minute, dayOfWeek, dayOfMonth)
  }, [scheduleMode, hour, minute, dayOfWeek, dayOfMonth, formData.schedule])

  // Effective schedule value
  const effectiveSchedule = scheduleMode === "custom" ? formData.schedule : computedCron

  const cronDescription = describeCron(effectiveSchedule)
  const nextRun = getNextRun(effectiveSchedule)
  const nextRunText = formatNextRun(nextRun)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleModeChange = (mode) => {
    setScheduleMode(mode)
    if (mode !== "custom") {
      // Auto-update the schedule field
      setFormData((prev) => ({ ...prev, schedule: buildCron(mode, hour, minute, dayOfWeek, dayOfMonth) }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!formData.name || !effectiveSchedule) {
      setError("Name and schedule are required")
      return
    }

    setLoading(true)
    try {
      await AutomationAPI.createProfile({
        name: formData.name,
        description: formData.description || null,
        cron: effectiveSchedule,
      })

      router.push("/admin/automation")
    } catch (err) {
      setError(err?.message || "Failed to create profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/admin/automation"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Profiles
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Create New Profile</h1>
        </div>
      </div>

      {/* Form area */}
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>New Automation Profile</CardTitle>
                <CardDescription className="mt-0.5">
                  Set up a new automation workflow with a schedule
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name + Status — two-column grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Profile Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-semibold">
                    Profile Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Daily Backup"
                    required
                    className="h-10"
                  />
                </div>

                {/* Enabled Status */}
                <div className="space-y-2">
                  <Label className="font-semibold">Status</Label>
                  <div className="flex items-center gap-3 h-10 px-3 border rounded-md bg-background">
                    <Switch
                      id="enabled"
                      checked={enabled}
                      onCheckedChange={setEnabled}
                    />
                    <label htmlFor="enabled" className="text-sm cursor-pointer select-none">
                      {enabled ? (
                        <span className="text-emerald-600 font-medium">Enabled</span>
                      ) : (
                        <span className="text-muted-foreground">Disabled</span>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="font-semibold">
                  Description{" "}
                  <span className="text-muted-foreground font-normal text-xs ml-1">(optional)</span>
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="What does this automation do?"
                  className="resize-none"
                  rows={3}
                />
              </div>

              {/* ── Schedule Section ── */}
              <div className="space-y-4">
                <Label className="font-semibold">
                  Schedule <span className="text-destructive">*</span>
                </Label>

                {/* Mode selector tabs */}
                <div className="flex flex-wrap gap-2">
                  {SCHEDULE_MODES.map((mode) => {
                    const active = scheduleMode === mode.value
                    const ModeIcon = mode.icon
                    return (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => handleModeChange(mode.value)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all ${
                          active
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        <ModeIcon className="w-3.5 h-3.5" />
                        {mode.label}
                      </button>
                    )
                  })}
                </div>

                {/* Preset config controls */}
                {scheduleMode !== "custom" && (
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                    {/* Time picker (for daily, weekly, monthly) */}
                    {scheduleMode !== "hourly" && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">Time</Label>
                        <div className="flex gap-3">
                          <Select value={hour} onValueChange={setHour}>
                            <SelectTrigger className="w-[140px] h-9">
                              <SelectValue placeholder="Hour" />
                            </SelectTrigger>
                            <SelectContent>
                              {HOURS.map((h) => (
                                <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={minute} onValueChange={setMinute}>
                            <SelectTrigger className="w-[100px] h-9">
                              <SelectValue placeholder="Min" />
                            </SelectTrigger>
                            <SelectContent>
                              {MINUTES.map((m) => (
                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Minute picker (for hourly) */}
                    {scheduleMode === "hourly" && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">At minute</Label>
                        <Select value={minute} onValueChange={setMinute}>
                          <SelectTrigger className="w-[100px] h-9">
                            <SelectValue placeholder="Min" />
                          </SelectTrigger>
                          <SelectContent>
                            {MINUTES.map((m) => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Day of week (for weekly) */}
                    {scheduleMode === "weekly" && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">Day of week</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {DAYS_OF_WEEK.map((day) => (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => setDayOfWeek(day.value)}
                              className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${
                                dayOfWeek === day.value
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background text-muted-foreground hover:border-primary/50"
                              }`}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Day of month (for monthly) */}
                    {scheduleMode === "monthly" && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">Day of month</Label>
                        <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                          <SelectTrigger className="w-[100px] h-9">
                            <SelectValue placeholder="Day" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 28 }, (_, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)}>{getOrdinal(i + 1)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                {/* Custom cron input */}
                {scheduleMode === "custom" && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="schedule"
                        name="schedule"
                        value={formData.schedule}
                        onChange={handleChange}
                        placeholder="e.g., 0 2 * * *"
                        required
                        className="h-10 font-mono pl-9"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Standard cron expression — min hour day month weekday
                    </p>
                  </div>
                )}

                {/* Human-readable schedule description + next run */}
                {effectiveSchedule && (
                  <div className="rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 p-3 space-y-1.5">
                    {cronDescription && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                          {cronDescription}
                        </p>
                      </div>
                    )}
                    {nextRunText && (
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-3.5 h-3.5 text-emerald-600/70 flex-shrink-0" />
                        <p className="text-xs text-emerald-600 dark:text-emerald-500">
                          Next run: {nextRunText}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-0.5">
                      <Timer className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                      <code className="text-xs font-mono text-muted-foreground">{effectiveSchedule}</code>
                    </div>
                  </div>
                )}

                {/* Advanced cron toggle (when not in custom mode) */}
                {scheduleMode !== "custom" && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdvancedCron(!showAdvancedCron)
                    }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showAdvancedCron ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    Advanced (edit cron directly)
                  </button>
                )}
                {showAdvancedCron && scheduleMode !== "custom" && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        value={effectiveSchedule}
                        onChange={(e) => {
                          setScheduleMode("custom")
                          setFormData((prev) => ({ ...prev, schedule: e.target.value }))
                        }}
                        className="h-10 font-mono pl-9"
                        placeholder="min hour day month weekday"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Editing switches to custom mode
                    </p>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <Separator />
              <div className="flex gap-3 pt-1">
                <Link href="/admin/automation" className="flex-1">
                  <Button variant="outline" className="w-full" type="button">
                    Cancel
                  </Button>
                </Link>

                <Button type="submit" className="flex-1 gap-2" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Create Profile
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
