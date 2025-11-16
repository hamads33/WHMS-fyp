"use client";

import React from "react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import axios from "axios";
import { useRouter } from "next/navigation";
import { GalleryVerticalEnd } from "lucide-react";

import { SignupForm } from "@/components/signup-form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const router = useRouter();

  const handleSuccess = async (res: CredentialResponse) => {
    try {
      if (!res.credential) throw new Error("No credential returned");

      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const r = await axios.post(`${backendUrl}/api/auth/signin/google`, {
        idToken: res.credential,
      });

      const { accessToken, refreshToken } = r.data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      router.push("/dashboard");
    } catch (err) {
      alert("Google signin failed");
    }
  };

  return (
    <div className="bg-muted flex min-h-screen flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">

        {/* Logo Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg shadow-sm">
            <GalleryVerticalEnd className="size-5" />
          </div>
          <h1 className="mt-3 font-semibold text-xl tracking-tight">WHMS Login</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sign in to continue to your dashboard
          </p>
        </div>

        {/* Card Container */}
        <Card className="shadow-sm border border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-center">
              Create or Access Your Account
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">

            {/* Custom Signup/Login Form */}
            <SignupForm />

            {/* Divider */}
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">OR</span>
              <Separator className="flex-1" />
            </div>

            {/* Google Login */}
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => alert("Google login failed")}
              />
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
