"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";

import { AuthAPI } from "@/lib/api/auth";
import { useAuth } from "@/lib/context/AuthContext";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loadSession } = useAuth();
  
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    // If token is present, verify automatically
    if (token) {
      verifyEmail(token);
    }
  }, [token]);

  const verifyEmail = async (verificationToken) => {
    setVerifying(true);
    setError(null);

    try {
      await AuthAPI.verifyEmail(verificationToken);
      setVerified(true);

      // Try to load session (in case user is already logged in)
      try {
        await loadSession();
        // If session loads successfully, redirect to dashboard
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } catch (err) {
        // User not logged in, redirect to login page
        setTimeout(() => {
          router.push("/login?verified=true");
        }, 3000);
      }

    } catch (err) {
      console.error("Verification error:", err);
      const errorMessage = 
        err.response?.data?.error || 
        err.message || 
        "Verification failed. The link may be expired.";
      setError(errorMessage);
    } finally {
      setVerifying(false);
    }
  };

  const handleResendEmail = async () => {
    setResending(true);
    setError(null);
    setResent(false);

    try {
      // ✅ FIXED: Use resendVerificationEmail method
      await AuthAPI.resendVerificationEmail(email, window.location.origin);
      setResent(true);
    } catch (err) {
      console.error("Resend error:", err);
      setError("Failed to resend email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  // Verifying state
  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <CardTitle>Verifying your email...</CardTitle>
            <CardDescription>
              Please wait while we verify your email address
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Success state
  if (verified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Email Verified!</CardTitle>
            <CardDescription>
              Your email has been successfully verified
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Your account is now active. Redirecting...
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground text-center">
              Taking you to your dashboard...
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Error state (when token verification failed)
  if (error && token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Verification Failed</CardTitle>
            <CardDescription>
              Unable to verify your email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground text-center">
              The verification link may have expired or is invalid.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button asChild className="w-full">
              <Link href="/register">Create New Account</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Back to Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Waiting for verification (no token)
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-10 w-10 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Verify your email</CardTitle>
          <CardDescription>
            {email ? `We sent a verification email to ${email}` : "Check your email for the verification link"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && !token && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {resent && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Verification email sent! Please check your inbox.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Please check your email and click the verification link to activate your account.</p>
            <p>If you don&apos;t see the email, check your spam folder.</p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResendEmail}
            disabled={resending || !email}
          >
            {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Resend Verification Email
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              Back to Login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}