import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info, CheckCircle2, AlertTriangle } from "lucide-react";

const icons = {
  success: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  error: <AlertTriangle className="h-4 w-4 text-red-600" />,
  info: <Info className="h-4 w-4 text-blue-600" />,
};

const colors = {
  success: "border-green-500/50 bg-green-50 text-green-800",
  error: "border-red-500/50 bg-red-50 text-red-800",
  info: "border-blue-500/50 bg-blue-50 text-blue-800",
};

export function PricingAlert({
  type = "info",
  title,
  description,
}: {
  type?: "success" | "error" | "info";
  title: string;
  description: string;
}) {
  return (
    <Alert className={`${colors[type]} flex items-start gap-2`}>
      {icons[type]}
      <div>
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </div>
    </Alert>
  );
}
