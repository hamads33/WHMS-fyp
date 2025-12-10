import { IpRulesPageClient } from "@/components/ip-rules-page-client"

export const metadata = {
  title: "IP Rules Management",
  description: "Manage IP blocking rules and security policies",
}

export default function IpRulesPage() {
  return <IpRulesPageClient />
}
