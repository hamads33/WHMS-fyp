"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2, CheckCircle2, Mail, User, Code2, AlertCircle,
  ShoppingBag, CreditCard, LifeBuoy, Server,
} from "lucide-react";
import { AuthAPI } from "@/lib/api/auth";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [success,     setSuccess]     = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  function validate() {
    const errs = {};
    if (!form.email)                              errs.email           = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email))   errs.email           = "Enter a valid email address";
    if (!form.password)                           errs.password        = "Password is required";
    else if (form.password.length < 8)            errs.password        = "At least 8 characters required";
    if (form.password !== form.confirmPassword)   errs.confirmPassword = "Passwords do not match";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await AuthAPI.register({ email: form.email, password: form.password });
      setSuccess(true);
      setTimeout(() => router.push("/verify-email?email=" + encodeURIComponent(form.email)), 3500);
    } catch (err) {
      const msg = err.message || "";
      setError(
        msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exists")
          ? "An account with this email already exists."
          : msg || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-5 bg-card rounded-2xl border border-border p-10 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Account Created!</h2>
            <p className="text-sm text-muted-foreground">One last step — verify your email to activate your account.</p>
          </div>
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 text-left">
            <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              A verification link was sent to <strong>{form.email}</strong>
            </AlertDescription>
          </Alert>
          <p className="text-xs text-muted-foreground">Redirecting to verification page…</p>
        </div>
      </div>
    );
  }

  // ── Registration form ───────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-background">

      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[420px] flex-col justify-between bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 p-10 text-white shrink-0 relative overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 h-72 w-72 rounded-full bg-white/5 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-white/5 blur-2xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
            <User className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Client Portal</span>
        </div>

        {/* Features */}
        <div className="space-y-6 relative z-10">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold leading-snug tracking-tight">
              Manage your<br />services & billing
            </h2>
            <p className="text-sm text-white/65 leading-relaxed">
              Create a free account to access the client portal.
            </p>
          </div>
          <ul className="space-y-3">
            {[
              { icon: Server,      text: "View and manage your active services" },
              { icon: CreditCard,  text: "Pay invoices and track billing history" },
              { icon: ShoppingBag, text: "Create and monitor orders" },
              { icon: LifeBuoy,    text: "Open and track support tickets" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/75">
                <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-white/70" />
                </div>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/40 relative z-10">© {new Date().getFullYear()} WHMS. All rights reserved.</p>
      </div>

      {/* Right: form */}
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-7">

          {/* Header */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium text-xs bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-full mb-2">
              <User className="h-3 w-3" />
              Client Account
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
            <p className="text-sm text-muted-foreground">
              Already have one?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
            </p>
          </div>

          {/* Global error */}
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
                id="email" name="email" type="email"
                placeholder="you@example.com"
                value={form.email} onChange={handleChange}
                autoComplete="email" disabled={loading}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "err-email" : undefined}
                className={fieldErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {fieldErrors.email && (
                <p id="err-email" className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />{fieldErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password" name="password" type="password"
                placeholder="••••••••"
                value={form.password} onChange={handleChange}
                autoComplete="new-password" disabled={loading}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? "err-password" : "pw-hint"}
                className={fieldErrors.password ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {fieldErrors.password
                ? <p id="err-password" className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />{fieldErrors.password}</p>
                : <p id="pw-hint" className="text-xs text-muted-foreground">Minimum 8 characters</p>
              }
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword" name="confirmPassword" type="password"
                placeholder="••••••••"
                value={form.confirmPassword} onChange={handleChange}
                autoComplete="new-password" disabled={loading}
                aria-invalid={!!fieldErrors.confirmPassword}
                aria-describedby={fieldErrors.confirmPassword ? "err-confirm" : undefined}
                className={fieldErrors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {fieldErrors.confirmPassword && (
                <p id="err-confirm" className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />{fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10"
              disabled={loading || !form.email || !form.password || !form.confirmPassword}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                "Create Client Account"
              )}
            </Button>
          </form>

          {/* Alternative sign-up */}
          <div className="space-y-2.5">
            <div className="relative flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              <span>Looking for something else?</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <Link
              href="/register-developer"
              className="flex items-center justify-center gap-2 w-full rounded-lg border border-border py-2.5 px-3 text-sm font-medium transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Code2 className="h-4 w-4 text-emerald-500" />
              Sign up as Developer instead
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
