"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DeveloperError({ error, reset }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
      <Alert variant="destructive" className="max-w-md text-left">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>{error?.message ?? "An unexpected error occurred."}</AlertDescription>
      </Alert>
      <Button onClick={reset} variant="outline" size="sm" className="gap-2">
        <RefreshCw className="h-4 w-4" />Try again
      </Button>
    </div>
  );
}
