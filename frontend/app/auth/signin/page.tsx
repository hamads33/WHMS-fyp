// app/login/page.tsx
"use client"
import React from "react"
import { LoginForm } from "@/components/login-form"
import { GoogleLogin, CredentialResponse } from "@react-oauth/google"
import axios from "axios"
import { useRouter } from "next/navigation"
import { GalleryVerticalEnd } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()

  const handleSuccess = async (res: CredentialResponse) => {
    try {
      if (!res.credential) throw new Error("No credential returned")
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || ""
      const r = await axios.post(`${backendUrl}/api/auth/signin/google`, {
        idToken: res.credential,
      })
      const { accessToken, refreshToken } = r.data
      localStorage.setItem("accessToken", accessToken)
      localStorage.setItem("refreshToken", refreshToken)
      router.push("/dashboard")
    } catch (err) {
      alert("Google signin failed")
    }
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-4" />
          </div>
          WHMS
        </a>
        {/* Your custom login form */}
        <LoginForm />
        {/* Divider or text */}
        <div className="text-center text-sm text-muted-foreground">or continue with</div>
        {/* Google Login */}
        <GoogleLogin onSuccess={handleSuccess} onError={() => alert("Google login failed")} />
      </div>
    </div>
  )
}


