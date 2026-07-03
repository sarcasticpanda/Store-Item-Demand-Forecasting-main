"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, TrendingUp, Package, BarChart3, RefreshCw, Zap, Activity, Upload, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const nav = [
  { href: "/",          label: "Dashboard",   icon: LayoutDashboard },
  { href: "/forecast",  label: "Forecast",    icon: TrendingUp      },
  { href: "/inventory", label: "Inventory",   icon: Package         },
  { href: "/upload",    label: "Upload Data", icon: Upload          },
  { href: "/agents",    label: "AI Agents",   icon: Brain           },
  { href: "/analytics", label: "Analytics",   icon: BarChart3       },
  { href: "/pipeline",  label: "Pipeline",    icon: RefreshCw       },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside
      className="fixed inset-y-0 left-0 w-64 flex flex-col z-30"
      style={{
        background: "linear-gradient(180deg, #030C06 0%, #050F08 60%, #04100A 100%)",
        borderRight: "1px solid rgba(22,163,74,0.12)",
      }}>

      {/* Subtle vertical texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(34,197,94,0.3) 3px, rgba(34,197,94,0.3) 4px)",
        }} />

      {/* Logo */}
      <div className="relative px-5 pt-7 pb-5">
        <div className="flex items-center gap-3">
          {/* Amber-to-red gradient logo mark */}
          <div className="relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
              boxShadow: "0 0 20px rgba(245,158,11,0.35), 0 0 40px rgba(245,158,11,0.1)",
            }}>
            <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[16px] font-bold tracking-tight leading-none"
              style={{ color: "#E8F5E8", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              InvenIQ
            </p>
            <p className="text-[10px] mt-0.5 tracking-[0.18em] uppercase"
              style={{ color: "#2E5E38" }}>
              Demand Intelligence
            </p>
          </div>
        </div>
        {/* Amber divider */}
        <div className="mt-5 h-px w-full"
          style={{ background: "linear-gradient(90deg, rgba(245,158,11,0.3), rgba(34,197,94,0.15), transparent)" }} />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-1 space-y-0.5">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "#1E4028", fontFamily: "'JetBrains Mono', monospace" }}>
          Navigation
        </p>

        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              )}>
              {active && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: "rgba(245,158,11,0.1)",
                    border: "1px solid rgba(245,158,11,0.2)",
                  }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 relative z-10 transition-colors duration-200",
                  active
                    ? "text-amber-400"
                    : "text-[#2A5535] group-hover:text-[#4A9960]"
                )}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                className="relative z-10 transition-colors duration-200"
                style={{
                  color: active ? "#FCD34D" : "#2E5E38",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: active ? 600 : 500,
                }}>
                {label}
              </span>
              {active && (
                <span className="ml-auto relative z-10 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-slow"
                    style={{ boxShadow: "0 0 6px rgba(245,158,11,0.8)" }} />
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Model status */}
      <div className="px-4 py-3">
        <div className="rounded-xl p-3"
          style={{
            background: "rgba(4,16,10,0.8)",
            border: "1px solid rgba(22,163,74,0.15)",
          }}>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "#1E4028", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Model Status
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow shrink-0"
              style={{ boxShadow: "0 0 6px rgba(34,197,94,0.6)" }} />
            <span className="text-xs" style={{ color: "#6DBF80" }}>LightGBM · Active</span>
          </div>
          <p className="text-[10px] mt-1.5" style={{ color: "#1E4028", fontFamily: "'JetBrains Mono', monospace" }}>
            R² 88.3% · MAE 3.41 units
          </p>
        </div>
      </div>

      {/* Bottom */}
      <div className="px-5 pb-6">
        <div className="h-px w-full mb-3"
          style={{ background: "linear-gradient(90deg, transparent, rgba(22,163,74,0.12), transparent)" }} />
        <p className="text-[10px]"
          style={{ color: "#1A3520", fontFamily: "'JetBrains Mono', monospace" }}>
          FastAPI · MongoDB · Next.js
        </p>
      </div>
    </aside>
  );
}
