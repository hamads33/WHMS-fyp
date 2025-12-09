"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, Calendar, AlertCircle, CheckCircle2, Zap, Code } from "lucide-react"
import { CronPreview } from "./cron-preview"
import { validateCron, type CronValidationResult } from "@/lib/cron-utils"

export type ScheduleType = "every-minute" | "every-n-minutes" | "hourly" | "daily" | "weekly" | "monthly" | "custom"

interface ScheduleConfig {
  type: ScheduleType
  minutes?: number
  hour?: number
  minute?: number
  dayOfWeek?: number
  dayOfMonth?: number
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

export function CronBuilder() {
  const [config, setConfig] = useState<ScheduleConfig>({
    type: "every-n-minutes",
    minutes: 5,
    hour: 9,
    minute: 0,
    dayOfWeek: 1,
    dayOfMonth: 1,
  })
  const [customCron, setCustomCron] = useState("")
  const [generatedCron, setGeneratedCron] = useState("*/5 * * * *")
  const [validation, setValidation] = useState<CronValidationResult>({ valid: true })
  const [activeTab, setActiveTab] = useState<"builder" | "advanced">("builder")

  // Generate cron from config
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

  // Update cron when config changes
  useEffect(() => {
    const cron = generateCronFromConfig(config)
    setGeneratedCron(cron)
    setValidation(validateCron(cron))
  }, [config, generateCronFromConfig])

  // Update validation when custom cron changes
  useEffect(() => {
    if (config.type === "custom") {
      setGeneratedCron(customCron)
      setValidation(validateCron(customCron))
    }
  }, [customCron, config.type])

  const updateConfig = (updates: Partial<ScheduleConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }))
  }

  const handleSubmit = () => {
    if (!validation.valid) {
      return
    }
    // This would be sent to your backend API
    console.log("Submitting cron:", generatedCron)
    alert(`Valid cron expression ready to send:\n${generatedCron}`)
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "builder" | "advanced")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="builder" className="gap-2">
            <Clock className="h-4 w-4" />
            Visual Builder
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2">
            <Code className="h-4 w-4" />
            Advanced (Cron)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule Configuration
              </CardTitle>
              <CardDescription>Choose how often you want your task to run</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Schedule Type Selector */}
              <div className="space-y-2">
                <Label htmlFor="schedule-type">Run task</Label>
                <Select value={config.type} onValueChange={(value: ScheduleType) => updateConfig({ type: value })}>
                  <SelectTrigger id="schedule-type" className="w-full">
                    <SelectValue placeholder="Select schedule type" />
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

              {/* Dynamic Inputs Based on Schedule Type */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Minutes interval for every-n-minutes */}
                {config.type === "every-n-minutes" && (
                  <div className="space-y-2">
                    <Label htmlFor="minutes-interval">Every</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={String(config.minutes || 5)}
                        onValueChange={(value) => updateConfig({ minutes: Number.parseInt(value) })}
                      >
                        <SelectTrigger id="minutes-interval">
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

                {/* Hour selection for hourly/daily/weekly/monthly */}
                {["hourly", "daily", "weekly", "monthly"].includes(config.type) && (
                  <div className="space-y-2">
                    <Label htmlFor="minute-select">At minute</Label>
                    <Select
                      value={String(config.minute || 0)}
                      onValueChange={(value) => updateConfig({ minute: Number.parseInt(value) })}
                    >
                      <SelectTrigger id="minute-select">
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

                {/* Hour selection for daily/weekly/monthly */}
                {["daily", "weekly", "monthly"].includes(config.type) && (
                  <div className="space-y-2">
                    <Label htmlFor="hour-select">At hour</Label>
                    <Select
                      value={String(config.hour || 9)}
                      onValueChange={(value) => updateConfig({ hour: Number.parseInt(value) })}
                    >
                      <SelectTrigger id="hour-select">
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

                {/* Day of week for weekly */}
                {config.type === "weekly" && (
                  <div className="space-y-2">
                    <Label htmlFor="day-of-week">On</Label>
                    <Select
                      value={String(config.dayOfWeek ?? 1)}
                      onValueChange={(value) => updateConfig({ dayOfWeek: Number.parseInt(value) })}
                    >
                      <SelectTrigger id="day-of-week">
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

                {/* Day of month for monthly */}
                {config.type === "monthly" && (
                  <div className="space-y-2">
                    <Label htmlFor="day-of-month">On day</Label>
                    <Select
                      value={String(config.dayOfMonth || 1)}
                      onValueChange={(value) => updateConfig({ dayOfMonth: Number.parseInt(value) })}
                    >
                      <SelectTrigger id="day-of-month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {i + 1}
                            {getOrdinalSuffix(i + 1)}
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

        <TabsContent value="advanced" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Custom Cron Expression
              </CardTitle>
              <CardDescription>
                Enter a standard cron expression (5 fields: minute hour day month weekday)
              </CardDescription>
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

              {/* Cron Format Reference */}
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-medium mb-2">Cron Format Reference</p>
                <div className="grid grid-cols-5 gap-2 text-xs font-mono">
                  <div className="text-center">
                    <div className="font-semibold text-foreground">Minute</div>
                    <div className="text-muted-foreground">0-59</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-foreground">Hour</div>
                    <div className="text-muted-foreground">0-23</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-foreground">Day</div>
                    <div className="text-muted-foreground">1-31</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-foreground">Month</div>
                    <div className="text-muted-foreground">1-12</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-foreground">Weekday</div>
                    <div className="text-muted-foreground">0-6</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  <p>
                    <code className="bg-background px-1 rounded">*</code> any value |{" "}
                    <code className="bg-background px-1 rounded">*/n</code> every n |{" "}
                    <code className="bg-background px-1 rounded">1,2,3</code> list |{" "}
                    <code className="bg-background px-1 rounded">1-5</code> range
                  </p>
                </div>
              </div>

              {/* Quick Examples */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Quick Examples</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Every 5 min", cron: "*/5 * * * *" },
                    { label: "Hourly", cron: "0 * * * *" },
                    { label: "Daily 9am", cron: "0 9 * * *" },
                    { label: "Weekdays 9am", cron: "0 9 * * 1-5" },
                    { label: "Weekly Mon", cron: "0 9 * * 1" },
                    { label: "Monthly 1st", cron: "0 9 1 * *" },
                  ].map((example) => (
                    <Badge
                      key={example.cron}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => {
                        setCustomCron(example.cron)
                        setConfig((prev) => ({ ...prev, type: "custom" }))
                      }}
                    >
                      {example.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Section - Always visible */}
      <CronPreview cron={generatedCron} validation={validation} />

      {/* Validation Status */}
      {validation.valid ? (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-600">Valid Cron Expression</AlertTitle>
          <AlertDescription className="text-green-600/80">
            This schedule is ready to be used with your automation tasks.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Invalid Cron Expression</AlertTitle>
          <AlertDescription>{validation.error || "Please check your cron expression format."}</AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button size="lg" onClick={handleSubmit} disabled={!validation.valid} className="gap-2">
          <Zap className="h-4 w-4" />
          Create Schedule
        </Button>
      </div>
    </div>
  )
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}
