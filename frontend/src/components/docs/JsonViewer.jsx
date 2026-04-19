"use client";

import { CopyButton } from "./CopyButton";
import { cn } from "@/lib/utils";

export function JsonViewer({ data, className, maxHeight = "320px" }) {
  const json =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);

  return (
    <div
      className={cn(
        "relative rounded-lg border border-border bg-muted/40 overflow-hidden",
        className
      )}
    >
      <div className="absolute right-2 top-2 z-10">
        <CopyButton text={json} />
      </div>
      <pre
        className="overflow-auto p-4 pr-10 text-xs font-mono text-foreground leading-relaxed"
        style={{ maxHeight }}
      >
        <code>{json}</code>
      </pre>
    </div>
  );
}
