import { cn } from "@/lib/utils";

const METHOD_STYLES = {
  get:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
  post:   "bg-blue-100   text-blue-700   dark:bg-blue-950/60   dark:text-blue-400",
  put:    "bg-amber-100  text-amber-700  dark:bg-amber-950/60  dark:text-amber-400",
  patch:  "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400",
  delete: "bg-red-100    text-red-700    dark:bg-red-950/60    dark:text-red-400",
};

const METHOD_WIDTHS = {
  get:    "w-14",
  post:   "w-14",
  put:    "w-14",
  patch:  "w-16",
  delete: "w-16",
};

export function MethodBadge({ method, className }) {
  const key = method?.toLowerCase();
  const style = METHOD_STYLES[key] || "bg-muted text-muted-foreground";
  const width = METHOD_WIDTHS[key] || "w-14";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md py-0.5 text-[11px] font-bold uppercase tracking-widest font-mono flex-shrink-0",
        style,
        width,
        className
      )}
    >
      {method?.toUpperCase()}
    </span>
  );
}
