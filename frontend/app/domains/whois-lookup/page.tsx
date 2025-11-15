export const runtime = "nodejs";
import { AppSidebar } from "@/components/app-sidebar";
import WhoisCard from "@/components/custom-components/whois-lookup";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui";
import { SubSiteHeader }from "@/components/custom-components/whois-subheader"
import { DomainAppSidebar } from "@/components/custom-components/domains-components/domains-sidebar";
export default function systemsettingspage(){
return (
<SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 52)",
          "--header-height": "calc(var(--spacing) * 10)",
        } as React.CSSProperties
      }
    >
      <DomainAppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
       <SubSiteHeader/>
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="mt-6">
              <WhoisCard />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
)
}