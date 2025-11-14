import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export  function ForgotPasswordPage() {
  return (
    <section className="flex min-h-screen items-center justify-center bg-muted px-4 py-16 md:py-32 dark:bg-background">
      <form
        action=""
        className="bg-card m-auto w-full max-w-sm overflow-hidden rounded-xl border shadow-md"
      >
        <div className="bg-card border-b p-8 pb-6 rounded-t-xl">
          <div className="text-center">
            <h1 className="mb-1 mt-4 text-xl font-semibold text-foreground">Recover Password</h1>
            <p className="text-sm text-muted-foreground">
              Enter your email to receive a reset link
            </p>
          </div>
          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="block text-sm text-foreground">
                Email
              </Label>
              <Input
                type="email"
                required
                name="email"
                id="email"
                placeholder="name@example.com"
                className="bg-input border"
              />
            </div>
            <Button className="w-full">Send Reset Link</Button>
          </div>
          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              We'll send you a link to reset your password.
            </p>
          </div>
        </div>
        <div className="p-3">
          <p className="text-accent-foreground text-center text-sm">
            Remembered your password?{" "}
            <Button asChild variant="link" className="px-2">
              <Link href="/auth/signin">Log in</Link>
            </Button>
          </p>
        </div>
      </form>
    </section>
  );
}
