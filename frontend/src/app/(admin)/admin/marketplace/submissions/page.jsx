"use client";

// Redirect to the main marketplace management page which includes submissions tab
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SubmissionsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/marketplace"); }, [router]);
  return null;
}
