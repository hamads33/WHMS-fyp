import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import data from "./data.json"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { OrderDataTable } from "@/components/custom-components/order-section-table"

export default function Page() {
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
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              
              <div className="px-4 lg:px-6">
                
               
              </div>
               <OrderDataTable data={data} /> 
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
