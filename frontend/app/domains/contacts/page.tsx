import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui";
import { DomainAppSidebar } from "@/components/custom-components/domains-components/domains-sidebar";
import ContactsPage from "@/components/custom-components/domains-components/contacts";


export default function domaincontactspage(){
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
                <ContactsPage/>
                
              </div>
             
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
)
}