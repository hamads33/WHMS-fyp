"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Save, Clock, Code, Calendar } from "lucide-react"
import { CronPreview } from "./cron-preview"
import { validateCron, type CronValidationResult } from "../../lib/cron-utils"
import { createProfile, updateProfile, type AutomationProfile } from "../../lib/automation"
import { toast } from "sonner"

type ScheduleType = "every-minute" | "every-n-minutes" | "hourly" | "daily" | "weekly" | "monthly" | "custom"

interface ScheduleConfig {
  type: ScheduleType
  minutes?: number
  hour?: number
  minute?: number
  dayOfWeek?: number
  dayOfMonth?: number
}

interface ProfileFormProps {
  profile?: AutomationProfile | null
  onBack: () => void
  onSaved: () => void
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

function parseCronToConfig(cron: string): { config: ScheduleConfig; customCron: string } {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) {
    return { config: { type: "custom" }, customCron: cron }
  }

  const [minute, hour, dayOfMonth, , dayOfWeek] = parts

  // Every minute
  if (cron === "* * * * *") {
    return { config: { type: "every-minute" }, customCron: "" }
  }

  // Every N minutes
  if (minute.startsWith("*/") && hour === "*" && dayOfMonth === "*" && dayOfWeek === "*") {
    return {
      config: { type: "every-n-minutes", minutes: Number.parseInt(minute.slice(2)) },
      customCron: "",
    }
  }

  // Hourly
  if (!minute.includes("*") && hour === "*" && dayOfMonth === "*" && dayOfWeek === "*") {
    return {
      config: { type: "hourly", minute: Number.parseInt(minute) },
      customCron: "",
    }
  }

  // Weekly
  if (!minute.includes("*") && !hour.includes("*") && dayOfMonth === "*" && dayOfWeek !== "*") {
    return {
      config: {
        type: "weekly",
        minute: Number.parseInt(minute),
        hour: Number.parseInt(hour),
        dayOfWeek: Number.parseInt(dayOfWeek),
      },
      customCron: "",
    }
  }

  // Monthly
  if (!minute.includes("*") && !hour.includes("*") && dayOfMonth !== "*" && dayOfWeek === "*") {
    return {
      config: {
        type: "monthly",
        minute: Number.parseInt(minute),
        hour: Number.parseInt(hour),
        dayOfMonth: Number.parseInt(dayOfMonth),
      },
      customCron: "",
    }
  }

  // Daily
  if (!minute.includes("*") && !hour.includes("*") && dayOfMonth === "*" && dayOfWeek === "*") {
    return {
      config: {
        type: "daily",
        minute: Number.parseInt(minute),
        hour: Number.parseInt(hour),
      },
      customCron: "",
    }
  }

  return { config: { type: "custom" }, customCron: cron }
}

export function ProfileForm({ profile, onBack, onSaved }: ProfileFormProps) {
  const isEditing = !!profile

  const [name, setName] = useState(profile?.name || "")
  const [description, setDescription] = useState(profile?.description || "")
  const [saving, setSaving] = useState(false)

  const initialParsed = profile ? parseCronToConfig(profile.cron) : null
  const [config, setConfig] = useState<ScheduleConfig>(
    initialParsed?.config || {
      type: "every-n-minutes",
      minutes: 5,
      hour: 9,
      minute: 0,
      dayOfWeek: 1,
      dayOfMonth: 1,
    },
  )
  const [customCron, setCustomCron] = useState(initialParsed?.customCron || "")
  const [generatedCron, setGeneratedCron] = useState(profile?.cron || "*/5 * * * *")
  const [validation, setValidation] = useState<CronValidationResult>({ valid: true })
  const [activeTab, setActiveTab] = useState<"builder" | "advanced">(
    initialParsed?.config.type === "custom" ? "advanced" : "builder",
  )

  const generateCronFromConfig = useCallback(
    (cfg: ScheduleConfig): string => {
      switch (cfg.type) {
        case "every-minute":
          return "* * * * *"
        case "every-n-minutes":
          return `*/${cfg.minutes || 5} * * * *`
        case "hourly":
          return `${cfg.minute || 0} * * * *`
        case "daily":
          return `${cfg.minute || 0} ${cfg.hour || 9} * * *`
        case "weekly":
          return `${cfg.minute || 0} ${cfg.hour || 9} * * ${cfg.dayOfWeek ?? 1}`
        case "monthly":
          return `${cfg.minute || 0} ${cfg.hour || 9} ${cfg.dayOfMonth || 1} * *`
        case "custom":
          return customCron
        default:
          return "*/5 * * * *"
      }
    },
    [customCron],
  )

  useEffect(() => {
    const cron = generateCronFromConfig(config)
    setGeneratedCron(cron)
    setValidation(validateCron(cron))
  }, [config, generateCronFromConfig])

  useEffect(() => {
    if (config.type === "custom") {
      setGeneratedCron(customCron)
      setValidation(validateCron(customCron))
    }
  }, [customCron, config.type])

  const updateConfig = (updates: Partial<ScheduleConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }))
  }

  const handleSubmit = async () => {
    if (!validation.valid || !name.trim()) return

    setSaving(true)
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      cron: generatedCron,
    }

    const res = isEditing ? await updateProfile(profile.id, payload) : await createProfile(payload)

    if (res.success) {
      toast.success(isEditing ? "Profile updated" : "Profile created")
      onSaved()
    } else {
      toast.error(res.error || "Failed to save profile")
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{isEditing ? "Edit Profile" : "New Profile"}</h2>
          <p className="text-muted-foreground">
            {isEditing ? "Update your automation profile settings" : "Create a new automation workflow"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>Basic information about this automation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., Website Monitor"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe what this automation does..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "builder" | "advanced")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="builder" className="gap-2">
            <Clock className="h-4 w-4" />
            Visual Builder
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2">
            <Code className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule Configuration
              </CardTitle>
              <CardDescription>Choose how often your task should run</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="schedule-type">Run task</Label>
                <Select value={config.type} onValueChange={(value: ScheduleType) => updateConfig({ type: value })}>
                  <SelectTrigger id="schedule-type">
                    <SelectValue placeholder="Select schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="every-minute">Every minute</SelectItem>
                    <SelectItem value="every-n-minutes">Every N minutes</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {config.type === "every-n-minutes" && (
                  <div className="space-y-2">
                    <Label>Every</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={String(config.minutes || 5)}
                        onValueChange={(v) => updateConfig({ minutes: Number.parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 5, 10, 15, 20, 30].map((m) => (
                            <SelectItem key={m} value={String(m)}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">minutes</span>
                    </div>
                  </div>
                )}

                {["hourly", "daily", "weekly", "monthly"].includes(config.type) && (
                  <div className="space-y-2">
                    <Label>At minute</Label>
                    <Select
                      value={String(config.minute || 0)}
                      onValueChange={(v) => updateConfig({ minute: Number.parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                          <SelectItem key={m} value={String(m)}>
                            :{m.toString().padStart(2, "0")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {["daily", "weekly", "monthly"].includes(config.type) && (
                  <div className="space-y-2">
                    <Label>At hour</Label>
                    <Select
                      value={String(config.hour || 9)}
                      onValueChange={(v) => updateConfig({ hour: Number.parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {i.toString().padStart(2, "0")}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {config.type === "weekly" && (
                  <div className="space-y-2">
                    <Label>On</Label>
                    <Select
                      value={String(config.dayOfWeek ?? 1)}
                      onValueChange={(v) => updateConfig({ dayOfWeek: Number.parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={String(day.value)}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {config.type === "monthly" && (
                  <div className="space-y-2">
                    <Label>On day</Label>
                    <Select
                      value={String(config.dayOfMonth || 1)}
                      onValueChange={(v) => updateConfig({ dayOfMonth: Number.parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Custom Cron Expression
              </CardTitle>
              <CardDescription>Enter a standard cron expression (5 fields)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-cron">Cron Expression</Label>
                <Input
                  id="custom-cron"
                  placeholder="*/5 * * * *"
                  value={customCron}
                  onChange={(e) => {
                    setCustomCron(e.target.value)
                    setConfig((prev) => ({ ...prev, type: "custom" }))
                  }}
                  className="font-mono"
                />
              </div>

              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-medium mb-2">Cron Format</p>
                <div className="grid grid-cols-5 gap-2 text-xs font-mono">
                  <div className="text-center">
                    <div className="font-semibold">Minute</div>
                    <div className="text-muted-foreground">0-59</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">Hour</div>
                    <div className="text-muted-foreground">0-23</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">Day</div>
                    <div className="text-muted-foreground">1-31</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">Month</div>
                    <div className="text-muted-foreground">1-12</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">Weekday</div>
                    <div className="text-muted-foreground">0-6</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CronPreview cron={generatedCron} validation={validation} />

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onBack}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!validation.valid || !name.trim() || saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : isEditing ? "Update Profile" : "Create Profile"}
        </Button>
      </div>
    </div>
  )
}
