import "./globals.css";
import { AuthProvider } from "@/lib/context/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { AdminThemeProvider } from "@/lib/context/ThemeContext";
import { QueryProvider } from "@/components/providers/query-provider";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <AdminThemeProvider>
              <AuthProvider>{children}</AuthProvider>
              <Toaster />
            </AdminThemeProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}