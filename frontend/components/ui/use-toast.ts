// /frontend/components/ui/use-toast.ts
"use client";

import { toast as sonnerToast } from "sonner";

export function useToast() {
  return {
    toast: {
      success: (msg: string) => sonnerToast.success(msg),
      error: (msg: string) => sonnerToast.error(msg),
      info: (msg: string) => sonnerToast(msg),
    },
  };
}
