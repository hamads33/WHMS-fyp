"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui";
import { cn } from "@/lib/utils";

// Tab Components
import GeneralTab from "./sections/general";
import CronTab from "./sections/cron";
import BackupsTab from "./sections/backups";
import BillingTab from "./sections/billing";
import NotificationsTab from "./sections/notifications";
import DomainsTab from "./sections/domains";
import CleanupTab from "./sections/cleanup";
import ProfilesTab from "./sections/profiles";

const tabs = [
  { id: "general", label: "General" },
  { id: "cron", label: "Cron" },
  { id: "backups", label: "Backups" },
  { id: "billing", label: "Billing" },
  { id: "notifications", label: "Notifications" },
  { id: "domains", label: "Domains" },
  { id: "cleanup", label: "Cleanup" },
  { id: "profiles", label: "Profiles" },
];

export default function AutomationSettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTab = searchParams.get("tab") || "general";

  const setTab = (tab: string) => {
    router.push(`/automation?tab=${tab}`);
  };

  // Which tab to show
  const renderTab = () => {
    switch (activeTab) {
      case "general":
        return <GeneralTab />;
      case "cron":
        return <CronTab />;
      case "backups":
        return <BackupsTab />;
      case "billing":
        return <BillingTab />;
      case "notifications":
        return <NotificationsTab />;
      case "domains":
        return <DomainsTab />;
      case "cleanup":
        return <CleanupTab />;
      case "profiles":
        return <ProfilesTab />;
      default:
        return <GeneralTab />;
    }
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 52)",
          "--header-height": "calc(var(--spacing) * 10)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />

      <SidebarInset className="flex flex-col min-h-screen">
        <SiteHeader />

        {/* MAIN WRAPPER */}
        <div className="px-8 py-8 flex flex-col gap-8 max-w-5xl">

          {/* PAGE TITLE */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Automation Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure scheduled system tasks, automated billing, cleanup rules, and cron behavior.
            </p>
          </div>

          {/* TABS */}
          <div className="flex gap-2 border-b pb-3 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={cn(
                  "px-4 py-2 text-sm rounded-full font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div className="mt-2">
            <div className="border rounded-xl p-6 bg-card shadow-sm">
              {renderTab()}
            </div>
          </div>

        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
