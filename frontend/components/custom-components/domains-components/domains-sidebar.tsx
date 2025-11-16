"use client"

import * as React from "react"
import {
  IconChartBar,
  IconWorld,
  IconList,
  IconFolderSearch,
  IconServer,
  IconAdjustments,
  IconUsers,
  IconReport,
  IconTag,
  IconSettings,
  IconInnerShadowTop,
  IconDatabase,
  IconFileWord,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "WHOIS Lookup",
      url: "/domains/whois-lookup",
      icon: IconChartBar,
    },

    // =======================
    //   DOMAIN MODULE
    // =======================
    {
      title: "Domain List",
      url: "/domains/list",
      icon: IconList,
    },
    {
      title: "Domain Details",
      url: "/domains/details",
      icon: IconFolderSearch,
    },
    {
      title: "DNS Management",
      url: "/domains/dns",
      icon: IconServer,
    },
    {
      title: "Nameservers",
      url: "/domains/nameservers",
      icon: IconAdjustments,
    },
    {
      title: "Contact Info",
      url: "/domains/contacts",
      icon: IconUsers,
    },
    {
      title: "Domain Logs",
      url: "/domains/logs",
      icon: IconReport,
    },
    {
      title: "TLD Pricing",
      url: "/domains/pricing",
      icon: IconTag,
    },
    {
      title: "Provider Settings",
      url: "/domains/providers",
      icon: IconSettings,
    },
  ],

  Shortcuts: [
    {
      name: "WHOIS Lookup",
      url: "/utilities/domains/whois-lookup",
      icon: IconDatabase,
    },
    {
      name: "Email Settings",
      url: "/utilities/emails",
      icon: IconFileWord,
    },
    {
      name: "Database Backup",
      url: "/utilities/db-backups",
      icon: IconDatabase,
    },
  ],
}

export function DomainAppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">WHMS</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.Shortcuts} />
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  )
}
