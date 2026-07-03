import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "InvenIQ — Demand Operations",
  description: "Demand forecasting and inventory operations terminal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-ground text-ink overflow-x-hidden">
        {/* Faint paper grid */}
        <div className="fixed inset-0 grid-bg opacity-40 pointer-events-none" />
        <Sidebar />
        <main className="ml-60 min-h-screen relative">
          {children}
        </main>
      </body>
    </html>
  );
}
