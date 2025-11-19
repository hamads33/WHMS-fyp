// /frontend/app/automation/cron/utils/cron-api.ts
import axios from "axios";

const BASE = `${process.env.NEXT_PUBLIC_API_URL}/automation`;

export type BuildCronResponse = {
  ok: boolean;
  cron?: string;
  pretty?: string;
  approxIntervalSec?: number | null;
  error?: string; // <-- REQUIRED
};


export interface ValidateCronResponse {
  ok: boolean;
  valid: boolean;
  cron: string;
  approxIntervalSec: number | null;
  pretty: string;
  errors?: string[];
}

export async function buildCron(payload: any): Promise<BuildCronResponse> {
  const { data } = await axios.post(`${BASE}/cron/build`, payload);
  return data;
}

export async function validateCron(expression: string): Promise<ValidateCronResponse> {
  const { data } = await axios.post(`${BASE}/cron/validate`, { expression });
  return data;
}
