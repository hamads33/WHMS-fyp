import "./globals.css";
import { AuthProvider } from "@/lib/context/AuthContext";  // ✅ CHANGED THIS LINE
import { Toaster } from "@/components/ui/toaster";        // ✅ ADDED SEMICOLON

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}