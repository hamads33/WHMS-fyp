"use client";

import { humanizeCron, validateCron } from "@/app/automation/lib/cron-utils";

export default function CronPreview({ value }: { value: string }) {
  const validation = validateCron(value);

  return (
    <div className="mt-2 p-3 border rounded bg-gray-50">
      <div className="text-sm font-semibold">Preview:</div>

      {!validation.valid ? (
        <div className="text-red-500 text-sm">
          {validation.error || "Invalid cron"}
        </div>
      ) : (
        <div className="text-green-600 text-sm">
          {humanizeCron(value)}
        </div>
      )}
    </div>
  );
}
