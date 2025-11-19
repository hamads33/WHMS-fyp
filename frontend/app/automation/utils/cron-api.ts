// /frontend/app/automation/cron/utils/cron-api.ts
import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_AUTOMATION_URL || "http://localhost:4000/api/automation";

// -------------------------
// Types
// -------------------------

export interface BuildCronResponse {
  ok: boolean;
  cron: string;
  pretty: string;
  approxIntervalSec: number | null;
}

export interface ValidateCronResponse {
  ok: boolean;
  valid: boolean;
  cron?: string;
  errors?: string[];
  approxIntervalSec?: number | null;
}

// -------------------------
// PAYLOAD BUILDERS — MUST MATCH BACKEND
// -------------------------

export function buildPayload(mode: string, values: any) {
  switch (mode) {
    case "everySeconds":
      return {
        type: "everySeconds",
        value: Number(values.value),
      };

    case "everyMinutes":
      return {
        type: "everyMinutes",
        value: Number(values.value),
      };

    case "everyHours":
      return {
        type: "everyHours",
        value: Number(values.value),
        minute: Number(values.minute),
      };

    case "daily":
      return {
        type: "daily",
        hour: Number(values.hour),
        minute: Number(values.minute),
      };

    case "weekly":
      return {
        type: "weekly",
        dayOfWeek: values.dayOfWeek,
        hour: Number(values.hour),
        minute: Number(values.minute),
      };

    case "monthly":
      return {
        type: "monthly",
        day: Number(values.day),
        hour: Number(values.hour),
        minute: Number(values.minute),
      };

    case "advanced":
      return {
        type: "advanced",
        expression: values.expression, // MUST use "expression"
      };

    default:
      throw new Error(`Unknown cron builder type: ${mode}`);
  }
}

// -------------------------
// API CALLS
// -------------------------

/**
 * POST /cron/build
 */
export async function buildCron(payload: any): Promise<BuildCronResponse> {
  try {
    const { data } = await axios.post(`${BASE}/cron/build`, payload);
    return data;
  } catch (err: any) {
    const message =
      err?.response?.data?.error || err?.message || "Failed to build cron";
    throw new Error(message);
  }
}

/**
 * POST /cron/validate
 */
export async function validateCron(expression: string): Promise<ValidateCronResponse> {
  try {
    const { data } = await axios.post(`${BASE}/cron/validate`, {
      expression,
    });
    return data;
  } catch (err: any) {
    return {
      ok: false,
      valid: false,
      errors: [err?.response?.data?.error || err.message],
    };
  }
}
