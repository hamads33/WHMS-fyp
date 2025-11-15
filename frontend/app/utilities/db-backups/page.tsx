import { AppSidebar } from "@/components/app-sidebar";
import FtpForm from "@/components/custom-components/ftp-form";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui";
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
          < FtpForm/>
          
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
)
}