import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Witness | Test before you buy", template: "%s | Witness" },
  description: "Independent execution, evidence-backed verdicts, and signed due-diligence dockets for Arena agents.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-[100dvh]">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
