"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield } from "lucide-react";

import { AuthAPI } from "@/lib/api/auth";
import { useAuth } from "@/lib/context/AuthContext";

export default function MFAVerificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loadSession } = useAuth();
  
  const userId = searchParams.get("userId");

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expired, setExpired] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }

    // Redirect if no userId
    if (!userId) {
      router.push("/login");
    }
  }, [userId, router]);

  const handleChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields filled
    if (index === 5 && value && newCode.every(digit => digit !== "")) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    
    // Check if pasted data is 6 digits
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split("");
      setCode(digits);
      
      // Auto-submit
      handleVerify(pastedData);
    }
  };

  async function handleVerify(verificationCode) {
    setError(null);
    setLoading(true);

    try {
      await AuthAPI.verifyMFALogin(userId, verificationCode);

      // Reload session and redirect to the correct portal
      const sessionData = await loadSession();
      const portalPath = sessionData?.portal === "admin" ? "/admin/dashboard" : "/client/dashboard";
      router.push(portalPath);

    } catch (err) {
      const msg = err.message || "";
      if (msg === "UNAUTHENTICATED" || msg.toLowerCase().includes("session") || msg.toLowerCase().includes("expired")) {
        setExpired(true);
      } else {
        setError("Invalid code. Please try again.");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fullCode = code.join("");
    
    if (fullCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    await handleVerify(fullCode);
  }

  // Session expired — show a clean redirect prompt
  if (expired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Shield className="h-10 w-10 text-amber-600" />
            </div>
            <CardTitle className="text-xl font-bold">Session Expired</CardTitle>
            <CardDescription>
              Your login session has expired. Please sign in again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push("/login")}>
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-10 w-10 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label className="text-center block">Verification Code</Label>
              <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={loading}
                    className="w-12 h-12 text-center text-lg font-semibold"
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                You can paste the full 6-digit code
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || code.some(d => d === "")}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify Code
            </Button>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have access to your authenticator?
              </p>
              <Link href="/login" className="text-sm text-primary hover:underline">
                Back to Login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}