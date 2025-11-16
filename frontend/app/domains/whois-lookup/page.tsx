export const runtime = "nodejs";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui";
import { SubSiteHeader } from "@/components/custom-components/whois-subheader";
import { DomainAppSidebar } from "@/components/custom-components/domains-components/domains-sidebar";
import WhoisCard from "@/components/custom-components/whois-lookup";

export default function SystemSettingsPage() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 52)",
          "--header-height": "calc(var(--spacing) * 10)",
        } as React.CSSProperties
      }
    >
      {/* Left Sidebar */}
      <DomainAppSidebar variant="inset" />

      {/* Main Content Section */}
      <SidebarInset className="flex flex-col min-h-screen bg-muted/10">
        {/* Global Header */}
        <SiteHeader />

        {/* Sub Header / Breadcrumbs */}
        <SubSiteHeader />

        {/* Main Body */}
        <div className="flex flex-1 flex-col px-6 py-6 gap-6">

          {/* Page Title Section */}
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              WHOIS Lookup
            </h1>
            <p className="text-muted-foreground text-sm">
              Quickly retrieve registration information for any domain.
            </p>
          </div>

          {/* Content Card Container */}
          <div className="w-full max-w-5xl">
            <div className="rounded-xl border bg-background shadow-sm p-6 transition-all duration-200 hover:shadow-md">
              <WhoisCard />
            </div>
          </div>

        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
