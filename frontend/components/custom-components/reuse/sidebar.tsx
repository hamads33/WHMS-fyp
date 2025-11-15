"use client"

import * as React from "react"
import {
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
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
//   user: {
//     name: "shadcn",
//     email: "m@example.com",
//     avatar: "/avatars/shadcn.jpg",
//   },
  navMain: [
    {
      title: "Clients",
      url: "/clients",
      icon: IconDashboard,
    },
    {
      title: "Orders",
      url: "/orders",
      icon: IconListDetails,
    },
    {
      title: "Billing",
      url: "/billing",
      icon: IconChartBar,
    },
    {
      title: "Support",
      url: "/support",
      icon: IconFolder,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: IconUsers,
    },
    {
      title: "Utilities",
      url: "/utilities",
      icon: IconUsers,
    },
  ],

//   navSecondary: [
//     {
//       title: "Settings",
//       url: "#",
//       icon: IconSettings,
//     },
//     {
//       title: "Get Help",
//       url: "#",
//       icon: IconHelp,
//     },
//     {
//       title: "Search",
//       url: "#",
//       icon: IconSearch,
//     },
//   ],
  Shortcuts: [
    {
      name: "WHOIS Lookup",
      url: "/utilities/domains/whois-lookup",
      icon: IconDatabase,
    },
    {
      name: "Manage Staff",
      url: "/admin/staff-management",
      icon: IconReport,
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
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        {/* <NavUser user={data.user} /> */}
      </SidebarFooter>
    </Sidebar>
  )
}
