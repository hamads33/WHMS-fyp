import parser from "cron-parser"

export interface CronValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates a cron expression using cron-parser
 * Returns validation result with error message if invalid
 */
export function validateCron(expression: string): CronValidationResult {
  if (!expression || !expression.trim()) {
    return { valid: false, error: "Cron expression is required" }
  }

  const trimmed = expression.trim()
  const parts = trimmed.split(/\s+/)

  // Standard cron has 5 fields
  if (parts.length !== 5) {
    return {
      valid: false,
      error: `Expected 5 fields (minute hour day month weekday), got ${parts.length}`,
    }
  }

  try {
    // Try to parse the cron expression
    parser.parse(trimmed)
    return { valid: true }
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Invalid cron expression",
    }
  }
}

/**
 * Parses a cron expression and returns the next N run dates
 */
export function getNextRuns(expression: string, count = 5): Date[] {
  try {
    const interval = parser.parse(expression.trim())
    const dates: Date[] = []

    for (let i = 0; i < count; i++) {
      dates.push(interval.next().toDate())
    }

    return dates
  } catch {
    return []
  }
}

/**
 * Common cron presets for quick selection
 */
export const CRON_PRESETS = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Every 30 minutes", value: "*/30 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 2 hours", value: "0 */2 * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Every 12 hours", value: "0 */12 * * *" },
  { label: "Daily at midnight", value: "0 0 * * *" },
  { label: "Daily at 9 AM", value: "0 9 * * *" },
  { label: "Weekly on Monday", value: "0 9 * * 1" },
  { label: "Monthly on 1st", value: "0 9 1 * *" },
] as const

export type CronPreset = (typeof CRON_PRESETS)[number]
