"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { name: "Dashboard", href: "/automation" },
  { name: "Profiles", href: "/automation/profiles" },
  { name: "Actions", href: "/automation/actions" },
  { name: "Runs", href: "/automation/runs" },
  { name: "Status", href: "/automation/status" },
];

export default function AutomationTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b mb-6">
      <div className="flex space-x-4 px-4">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "px-4 py-2 border-b-2 text-sm",
                active
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-primary hover:border-primary"
              )}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
