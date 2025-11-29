// frontend/app/automation/lib/cron-utils.ts
import cronstrue from "cronstrue";

export type ParsedCron =
  | { mode: "every_x_minutes"; minutes: number }
  | { mode: "hourly"; hours: number }
  | { mode: "daily" }
  | { mode: "weekly"; dayOfWeek: number }
  | { mode: "monthly"; dayOfMonth: number }
  | { mode: "custom"; fields: [string, string, string, string, string] }
  | { mode: "manual"; expr: string };

export function validateCron(expr: string): { valid: boolean; error?: string } {
  if (!expr || !expr.trim()) return { valid: false, error: "Empty cron" };
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return { valid: false, error: "Cron must have 5 fields" };

  const token = (p: string, min: number, max: number) => {
    if (p === "*") return true;
    if (/^\*\/\d+$/.test(p)) return true;
    if (/^\d+$/.test(p)) { const n = +p; return n >= min && n <= max; }
    if (/^\d+-\d+$/.test(p)) { const [a,b]=p.split("-").map(Number); return a>=min && b<=max && a<=b; }
    if (/^[\d,]+$/.test(p)) return p.split(",").every(x=>/^\d+$/.test(x) && +x>=min && +x<=max);
    return false;
  };

  const [min, hour, dom, mon, dow] = parts;
  if (!token(min,0,59)) return { valid:false, error:"Invalid minute field" };
  if (!token(hour,0,23)) return { valid:false, error:"Invalid hour field" };
  if (!token(dom,1,31)) return { valid:false, error:"Invalid day-of-month field" };
  if (!token(mon,1,12)) return { valid:false, error:"Invalid month field" };
  if (!token(dow,0,6)) return { valid:false, error:"Invalid day-of-week field (0-6)" };

  return { valid: true };
}

export function humanizeCron(expr: string): string {
  try {
    return cronstrue.toString(expr, { use24HourTimeFormat: true, throwExceptionOnParseError: false });
  } catch { return expr; }
}

export function parseCronExpression(expr: string): ParsedCron {
  const normalized = (expr || "").trim();
  const v = validateCron(normalized);
  if (!v.valid) return { mode: "manual", expr: normalized };
  const parts = normalized.split(/\s+/);
  const [min,hour,dom,mon,dow] = parts;

  if (/^\*\/\d+$/.test(min) && hour === "*" && dom === "*" && mon === "*" && dow === "*") {
    return { mode: "every_x_minutes", minutes: Number(min.split("/")[1]) };
  }
  if (min === "0" && /^\*\/\d+$/.test(hour) && dom === "*" && mon === "*" && dow === "*") {
    return { mode: "hourly", hours: Number(hour.split("/")[1]) };
  }
  if (min === "0" && hour === "0" && dom === "*" && mon === "*" && dow === "*") return { mode: "daily" };
  if (min === "0" && hour === "0" && dom === "*" && mon === "*" && /^\d$/.test(dow)) return { mode: "weekly", dayOfWeek: Number(dow) };
  if (min === "0" && hour === "0" && /^\d{1,2}$/.test(dom) && mon === "*" && dow === "*") return { mode: "monthly", dayOfMonth: Number(dom) };
  return { mode: "custom", fields: [min,hour,dom,mon,dow] };
}

export function buildCronFromParsed(p: ParsedCron): string {
  switch(p.mode) {
    case "every_x_minutes": return `*/${Math.max(1, Math.floor(p.minutes))} * * * *`;
    case "hourly": return `0 */${Math.max(1, Math.floor(p.hours))} * * *`;
    case "daily": return `0 0 * * *`;
    case "weekly": return `0 0 * * ${p.dayOfWeek}`;
    case "monthly": return `0 0 ${Math.min(31, Math.max(1, Math.floor(p.dayOfMonth)))} * *`;
    case "custom": return p.fields.join(" ");
    case "manual": return p.expr;
    default: return "* * * * *";
  }
}
