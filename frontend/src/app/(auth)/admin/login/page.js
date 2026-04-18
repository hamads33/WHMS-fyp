"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, Lock } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";

export default function AdminLoginPage() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const { login }   = useAuth();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await login(email, password);
      if (response?.requiresMFA) {
        router.push(`/mfa-verify?userId=${response.userId}`);
        return;
      }
      // AuthContext will redirect to /admin based on role
    } catch (err) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("many") || msg.toLowerCase().includes("limit") || msg.toLowerCase().includes("429")) {
        setError("Too many login attempts. Please wait a moment and try again.");
      } else if (msg.toLowerCase().includes("verif")) {
        setError("Please verify your email before signing in.");
      } else if (msg.toLowerCase().includes("deactivat")) {
        setError("Account deactivated. Contact your system administrator.");
      } else {
        setError("Invalid credentials or insufficient permissions.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-950">

      {/* Narrow centered card */}
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">

          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 mx-auto">
              <Shield className="h-7 w-7 text-white/70" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Staff Access</h1>
              <p className="text-sm text-white/40 mt-1">Restricted area — authorised personnel only</p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70 text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-white/20"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-white/70 text-sm">Password</Label>
                <Link href="/forgot-password" className="text-xs text-white/30 hover:text-white/60">
                  Forgot?
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
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-white/20"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-white text-slate-900 hover:bg-white/90 font-semibold"
              disabled={loading}
            >
              {loading
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Lock className="mr-2 h-4 w-4" />}
              Sign in
            </Button>
          </form>

          <p className="text-center text-xs text-white/20">
            Not staff?{" "}
            <Link href="/login" className="text-white/40 hover:text-white/60 underline underline-offset-2">
              Return to main login
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
