import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InvenIQ — Demand Intelligence for Quick Commerce",
  description: "Forecast demand, prevent stockouts, and automate purchase orders across your dark-store network.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
