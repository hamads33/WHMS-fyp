import "./globals.css";
import { Inter } from "next/font/google";
import { Providers } from "./providers"; // Relative import

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "WHMS",
  description: "",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
