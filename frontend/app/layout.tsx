import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "InvenIQ — Demand Intelligence",
  description: "AI-powered inventory management and demand forecasting",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased bg-bg-base text-slate-200 overflow-x-hidden">
        {/* Global scan line */}
        <div className="scan-line" />
        {/* Grid background */}
        <div className="fixed inset-0 grid-bg opacity-60 pointer-events-none" />
        <Sidebar />
        <main className="ml-64 min-h-screen relative">
          {children}
        </main>
      </body>
    </html>
  );
}
