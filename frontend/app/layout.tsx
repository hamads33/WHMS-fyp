
import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// 🔥 Add your AuthProvider import
import { AuthProvider } from "../src/hooks/useAuth";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

// Updated metadata for automation scheduler
export const metadata: Metadata = {
  title: "Automation Scheduler - Cron Builder",
  description: "Build and validate cron schedules with an intuitive visual interface",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {/* 🔥 Wrap the entire app here */}
        <AuthProvider>
          {children}
        </AuthProvider>

        <Analytics />
      </body>
    </html>
  );
}
