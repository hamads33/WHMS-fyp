import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui";
import { DomainAppSidebar } from "@/components/custom-components/domains-components/domains-sidebar";
import DomainListPage from "@/components/custom-components/domains-components/domain-list";


export default function domainlistspage(){
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
                
                <DomainListPage/>
              </div>
             
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
)
}