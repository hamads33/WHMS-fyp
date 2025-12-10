// app/auth/login/page.tsx
"use client";

import { useState } from "react";
import { LoginForm } from "@/components/login-form";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in -> redirect by role
  if (!loading && user) {
    const roles = user.roles || [];
    if (roles.includes("admin") || roles.includes("superadmin") || roles.includes("staff")) {
      router.replace("/admin");
    } else if (roles.includes("reseller")) {
      router.replace("/reseller");
    } else if (roles.includes("developer")) {
      router.replace("/developer");
    } else {
      router.replace("/clients");
    }
    return null;
  }

  async function handleLogin({ email, password }: { email: string; password: string }) {
    setError(null);
    setBusy(true);
    try {
      await login({ email, password });
      // login will refresh user; redirect logic will run on next render
    } catch (err: any) {
      console.error("login error", err);
      setError(err?.response?.data?.error || err?.message || "Invalid email or password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-md">
        <LoginForm onSubmit={handleLogin} loading={busy} error={error} />
      </div>
    </main>
  );
}
