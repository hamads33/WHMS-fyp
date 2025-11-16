import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui";
import { SectionCards } from "@/components/section-cards"
import { SyssetAppSidebar } from "@/components/custom-components/system-settings/sysset-sidebar";
import { DomainAppSidebar } from "@/components/custom-components/domains-components/domains-sidebar";
import TLDPage from "@/components/custom-components/domains-components/tld-pricing";


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
      < DomainAppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              
              
              <div className="px-4 lg:px-6">
                
                <TLDPage/>
              </div>
             
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
)
}