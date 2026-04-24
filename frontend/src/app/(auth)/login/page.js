"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Shield, User, Code2 } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";

function LoginPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { login }    = useAuth();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [success,  setSuccess]  = useState(null);

  useEffect(() => {
    if (searchParams.get("verified")) setSuccess("Email verified! You can now sign in.");
    if (searchParams.get("reset"))    setSuccess("Password reset successful. Sign in below.");
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) { setError("Email is required."); return; }
    if (!password)     { setError("Password is required."); return; }

    setLoading(true);
    try {
      const response = await login(email, password);
      if (response?.requiresMFA) {
        router.push(`/mfa-verify?userId=${response.userId}`);
      }
    } catch (err) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("many") || msg.toLowerCase().includes("limit")) {
        setError("Too many login attempts. Please wait a moment and try again.");
      } else if (msg.toLowerCase().includes("verif")) {
        setError("Please verify your email before signing in.");
      } else if (msg.toLowerCase().includes("deactivat")) {
        setError("Your account has been deactivated. Contact support.");
      } else {
        setError(msg || "Invalid email or password.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">

      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[420px] shrink-0 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 text-white relative overflow-hidden">
        {/* Subtle decorative gradient orb */}
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-primary/5 blur-2xl translate-y-1/4 -translate-x-1/4 pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
            <Shield className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">WHMS</span>
        </div>

        {/* Middle content */}
        <div className="space-y-6 relative z-10">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold leading-snug tracking-tight">
              Sign in to your<br />portal
            </h2>
            <p className="text-sm text-white/65 leading-relaxed max-w-xs">
              Your account role determines which portal you land on after signing in.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            {[
              { icon: User,   label: "Client",    desc: "Services & billing" },
              { icon: Code2,  label: "Developer",  desc: "Plugin marketplace" },
              { icon: Shield, label: "Admin",      desc: "Platform management" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-white/60" />
                </div>
                <div>
                  <span className="font-medium text-white/90">{label}</span>
                  <span className="text-white/50"> — {desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/35 relative z-10">
          © {new Date().getFullYear()} WHMS. All rights reserved.
        </p>
      </div>

      {/* Right: sign-in form */}
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-7">

          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in — you&apos;ll be redirected to your portal automatically.
            </p>
          </div>

          {/* Feedback banners */}
          {success && (
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950" role="status" aria-live="polite">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">{success}</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" role="alert" aria-live="assertive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
                aria-describedby={error ? "login-error" : undefined}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
                  tabIndex={0}
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full h-10" disabled={loading || !email || !password}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Register options */}
          <div className="space-y-3">
            <div className="relative flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              <span>New to WHMS?</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 rounded-lg border border-border py-2.5 px-3 text-sm font-medium transition-colors hover:bg-muted/60 hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <User className="h-4 w-4 text-blue-500" />
                Client
              </Link>
              <Link
                href="/register-developer"
                className="flex items-center justify-center gap-2 rounded-lg border border-border py-2.5 px-3 text-sm font-medium transition-colors hover:bg-muted/60 hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Code2 className="h-4 w-4 text-emerald-500" />
                Developer
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
