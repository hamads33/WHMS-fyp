import cronstrue from "cronstrue";
import parser from "cron-parser";

export function validateCron(expr: string): { valid: boolean; error?: string } {
  if (!expr) return { valid: false, error: "Cron cannot be empty" };

  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5)
    return { valid: false, error: "Cron must contain 5 fields" };

  try {
    parser.parseExpression(expr);
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err?.message || "Invalid cron" };
  }
}

export function humanizeCron(expr: string): string {
  try {
    return cronstrue.toString(expr, {
      use24HourTimeFormat: true,
      throwExceptionOnParseError: false,
    });
  } catch {
    return expr;
  }
}
