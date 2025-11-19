// /frontend/app/automation/components/StatusBadge.tsx
import { Badge } from "@/components/ui/badge";

export default function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>
  ) : (
    <Badge className="bg-gray-500 hover:bg-gray-600">Inactive</Badge>
  );
}
