import { Info } from "lucide-react";

export function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-md border"
      style={{
        backgroundColor: "var(--info-bg)",
        borderColor: "var(--info-border)",
        color: "var(--info-text)",
      }}
    >
      <Info className="h-5 w-5 mt-0.5" />
      <p className="text-sm leading-tight">{children}</p>
    </div>
  );
}
