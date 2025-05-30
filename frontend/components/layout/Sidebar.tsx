"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, TrendingUp, Package, BarChart3, RefreshCw, Zap, Activity, Upload, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const nav = [
  { href: "/",          label: "Dashboard",   icon: LayoutDashboard, color: "text-accent-blue",   glow: "rgba(59,130,246,0.15)"  },
  { href: "/forecast",  label: "Forecast",    icon: TrendingUp,      color: "text-accent-cyan",   glow: "rgba(6,182,212,0.15)"   },
  { href: "/inventory", label: "Inventory",   icon: Package,         color: "text-accent-green",  glow: "rgba(16,185,129,0.15)"  },
  { href: "/upload",    label: "Upload Data", icon: Upload,          color: "text-amber-400",     glow: "rgba(245,158,11,0.15)"  },
  { href: "/agents",    label: "AI Agents",   icon: Brain,           color: "text-violet-400",    glow: "rgba(139,92,246,0.15)"  },
  { href: "/analytics", label: "Analytics",   icon: BarChart3,       color: "text-accent-violet", glow: "rgba(139,92,246,0.15)"  },
  { href: "/pipeline",  label: "Pipeline",    icon: RefreshCw,       color: "text-slate-400",     glow: "rgba(100,116,139,0.15)" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 w-64 flex flex-col z-30"
      style={{ background: "rgba(9,10,13,0.95)", borderRight: "1px solid rgba(30,33,48,0.8)", backdropFilter: "blur(20px)" }}>

      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(59,130,246,0.5) 2px, rgba(59,130,246,0.5) 4px)" }} />
      </div>

      {/* Logo */}
      <div className="relative px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)", boxShadow: "0 0 20px rgba(59,130,246,0.4)" }}>
            <Zap className="w-4.5 h-4.5 text-white" />
            <div className="absolute inset-0 rounded-xl animate-pulse-slow"
              style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.3), transparent)" }} />
          </div>
          <div>
            <p className="text-[15px] font-bold text-white tracking-tight leading-none">InvenIQ</p>
            <p className="text-[10px] text-slate-500 mt-0.5 tracking-widest uppercase">Demand Intelligence</p>
          </div>
        </div>
        <div className="mt-4 h-px w-full" style={{ background: "linear-gradient(90deg, rgba(59,130,246,0.3), rgba(6,182,212,0.3), transparent)" }} />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Navigation</p>
        {nav.map(({ href, label, icon: Icon, color, glow }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                active
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-200"
              )}
              style={active ? { background: `${glow}`, border: `1px solid ${glow.replace("0.15", "0.3")}` } : {}}>
              {active && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: glow, border: `1px solid ${glow.replace("0.15", "0.25")}` }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <Icon className={cn("w-4 h-4 shrink-0 relative z-10 transition-colors", active ? color : "group-hover:text-slate-300")} />
              <span className="relative z-10">{label}</span>
              {active && (
                <div className="ml-auto relative z-10 w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: glow.replace("0.15", "1").replace("rgba", "rgb").replace(",0.15)", ")") }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Model status */}
      <div className="px-4 py-4">
        <div className="rounded-xl p-3 border border-bg-border bg-bg-panel">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5 text-accent-green" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Model Status</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse-slow shrink-0" />
            <span className="text-xs text-slate-300">LightGBM · Active</span>
          </div>
          <p className="text-[10px] text-slate-600 mt-1.5">R² 88.3% · MAE 3.41 units</p>
        </div>
      </div>

      {/* Bottom stack */}
      <div className="px-5 pb-5">
        <div className="h-px w-full mb-3" style={{ background: "linear-gradient(90deg, transparent, rgba(30,33,48,0.8), transparent)" }} />
        <p className="text-[10px] text-slate-700 font-mono">FastAPI · MongoDB · Next.js</p>
      </div>
    </aside>
  );
}
