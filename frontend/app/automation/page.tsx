import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui";
import { ChartAreaInteractive } from "@/components/custom-components/chart-area-interactive";
import { ButtonGroupSplit } from "@/components/ui/split-button";
import { ButtonGroupSelect } from "@/components/custom-components/button-group-select";

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
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              
              <div className="px-4 lg:px-6">
                
                <ChartAreaInteractive /> 
              </div>
                <ButtonGroupSelect/>
              <ButtonGroupSplit/>
              <ButtonGroupSplit/>
              <ButtonGroupSplit/>
            
              {/* <DataTable data={data} /> */}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
)
}