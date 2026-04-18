"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DeveloperRoot() {
  const router = useRouter();
  useEffect(() => { router.replace("/developer/dashboard"); }, [router]);
  return null;
}
