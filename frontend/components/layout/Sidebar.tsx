"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, TrendingUp, Package, BarChart3, RefreshCw, Upload, Brain } from "lucide-react";
import { motion } from "framer-motion";

const nav = [
  { href: "/",          label: "Dashboard",   icon: LayoutDashboard, code: "00" },
  { href: "/forecast",  label: "Forecast",    icon: TrendingUp,      code: "01" },
  { href: "/inventory", label: "Inventory",   icon: Package,         code: "02" },
  { href: "/upload",    label: "Upload Data", icon: Upload,          code: "03" },
  { href: "/agents",    label: "AI Agents",   icon: Brain,           code: "04" },
  { href: "/analytics", label: "Analytics",   icon: BarChart3,       code: "05" },
  { href: "/pipeline",  label: "Pipeline",    icon: RefreshCw,       code: "06" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside
      className="fixed inset-y-0 left-0 w-60 flex flex-col z-30"
      style={{
        background: "var(--surface)",
        borderRight: "1px solid var(--rule-strong)",
      }}>

      {/* Logo / masthead */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: "1px solid var(--rule)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[5px] flex items-center justify-center shrink-0"
            style={{ background: "var(--ink)" }}>
            <span className="text-[15px] font-extrabold tracking-tight" style={{ color: "var(--surface)" }}>iQ</span>
          </div>
          <div>
            <p className="text-[15px] font-extrabold tracking-tight leading-none" style={{ color: "var(--ink)" }}>
              InvenIQ
            </p>
            <p className="text-[9px] mt-1 tracking-[0.2em] uppercase font-mono" style={{ color: "var(--ink-3)" }}>
              Demand Ops
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-2 pb-2.5 text-[9px] font-semibold uppercase tracking-[0.2em] font-mono"
          style={{ color: "var(--ink-4)" }}>
          Navigation
        </p>

        {nav.map(({ href, label, icon: Icon, code }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className="group relative flex items-center gap-3 pl-3 pr-2 py-2 rounded text-sm transition-colors duration-150">
              {active && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded"
                  style={{
                    background: "var(--brand-soft)",
                    borderLeft: "2px solid var(--brand)",
                  }}
                  transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                />
              )}
              <span className="relative z-10 text-[9px] font-mono w-4 shrink-0"
                style={{ color: active ? "var(--brand)" : "var(--ink-4)" }}>{code}</span>
              <Icon className="w-4 h-4 shrink-0 relative z-10"
                style={{ color: active ? "var(--brand)" : "var(--ink-3)" }}
                strokeWidth={active ? 2.4 : 2} />
              <span className="relative z-10 transition-colors"
                style={{
                  color: active ? "var(--brand-ink)" : "var(--ink-2)",
                  fontWeight: active ? 600 : 500,
                }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Model status — ruled manifest box */}
      <div className="px-3 pb-3">
        <div className="rounded p-3" style={{ background: "var(--panel)", border: "1px solid var(--rule)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] font-mono" style={{ color: "var(--ink-3)" }}>
              Model Status
            </span>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--sig-green)" }} />
          </div>
          <p className="text-xs font-medium" style={{ color: "var(--ink)" }}>LightGBM · Active</p>
          <div className="mt-2 pt-2 flex items-center justify-between font-mono text-[10px]"
            style={{ borderTop: "1px solid var(--rule)", color: "var(--ink-3)" }}>
            <span>R² 88.3%</span>
            <span>MAE 3.41</span>
          </div>
        </div>
      </div>

      {/* Footer stamp */}
      <div className="px-5 pb-5">
        <p className="text-[9px] font-mono tracking-wide" style={{ color: "var(--ink-4)" }}>
          FastAPI · MongoDB · Next.js
        </p>
      </div>
    </aside>
  );
}
