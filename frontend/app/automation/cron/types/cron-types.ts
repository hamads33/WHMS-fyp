// /frontend/app/automation/cron/types/cron-types.ts

export type CronMode =
  | "everySeconds"
  | "everyMinutes"
  | "everyHours"
  | "daily"
  | "weekly"
  | "monthly"
  | "advanced";

export interface CronPayload {
  type: CronMode;

  // Simple modes
  value?: number;

  // Hours
  hour?: number;
  minute?: number;

  // Weekly
  dayOfWeek?: number;

  // Monthly
  day?: number;

  // Advanced
  expression?: string;
}

export interface CronPreviewData {
  cron: string;
  approxIntervalSec: number | null;
  pretty: string;
  nextRuns?: string[];
}
