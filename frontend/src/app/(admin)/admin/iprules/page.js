import { IpRulesPageClient } from "@/components/ip-rules-page-client";

export const metadata = {
  title: "IP Rules Management",
  description: "Manage IP allow and deny rules",
};

export default function IpRulesPage() {
  return <IpRulesPageClient />;
}
