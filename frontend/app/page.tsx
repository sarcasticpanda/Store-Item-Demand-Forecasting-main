"use client";
import { useState, useEffect } from "react";
import { api, type DashboardStats, type Alert, type Store, type Item, type FestivalEvent } from "@/lib/api";
import { AlertTriangle, TrendingUp, Package, Store as StoreIcon, Activity, ArrowRight, Calendar, Flame, Info } from "lucide-react";
import { StaticSpotlight } from "@/components/ui/spotlight";

const SEGMENT_BADGE: Record<string, string> = {
  fast: "badge-fast", slow: "badge-slow", premium: "badge-premium", essential: "badge-essential",
};
const ALERT_BORDER: Record<string, string> = { critical: "border-l-red-500/70", reorder: "border-l-amber-500/70" };
const ALERT_BG:     Record<string, string> = { critical: "bg-red-500/5",        reorder: "bg-amber-500/5" };
const TIER_DOT:     Record<string, string> = {
  high:   "bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]",
  medium: "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]",
  low:    "bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.6)]",
};
const MULT_COLOR = (m: number) => m >= 1.5 ? "text-red-400" : m >= 1.3 ? "text-amber-400" : "text-emerald-400";

function KpiCard({ label, value, sub, icon: Icon, accent, border }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent: string; border: string;
}) {
  return (
    <div className="card-glass group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
      style={{ borderColor: border }}>
      <div className="relative z-10 flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="section-title">{label}</p>
          <p className="text-2xl font-bold text-white mt-1 font-mono">{value}</p>
          {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats]       = useState<DashboardStats | null>(null);
  const [alerts, setAlerts]     = useState<Alert[]>([]);
  const [stores, setStores]     = useState<Store[]>([]);
  const [items, setItems]       = useState<Item[]>([]);
  const [events, setEvents]     = useState<FestivalEvent[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.dashboard().catch(() => null),
      api.alerts(undefined, "active").catch(() => []),
      api.stores().catch(() => []),
      api.items().catch(() => []),
      api.upcomingEvents(90).catch(() => []),
    ]).then(([s, a, st, it, ev]) => {
      setStats(s); setAlerts(a); setStores(st); setItems(it); setEvents(ev); setLoading(false);
    });
  }, []);

  const storeMap = Object.fromEntries(stores.map((s) => [s._id, s]));
  const criticalAlerts  = alerts.filter((a) => a.alert_type === "critical");
  const reorderAlerts   = alerts.filter((a) => a.alert_type === "reorder");

  // Stockout urgency: alerts sorted by days_until_stockout ascending
  const urgentAlerts = [...alerts]
    .filter((a) => a.days_until_stockout <= 5)
    .sort((a, b) => a.days_until_stockout - b.days_until_stockout)
    .slice(0, 8);

  // Top movers by avg_daily_sales
  const topItems = [...items].sort((a, b) => b.avg_daily_sales - a.avg_daily_sales).slice(0, 8);

  const urgencyColor = (d: number) =>
    d <= 1 ? "border-red-500/40 bg-red-500/8 text-red-300" :
    d <= 3 ? "border-amber-500/40 bg-amber-500/8 text-amber-300" :
             "border-slate-600/40 bg-slate-800/30 text-slate-400";

  return (
    <div className="relative min-h-screen">
      {/* Hero banner */}
      <div className="relative overflow-hidden border-b border-bg-border hero-gradient">
        <StaticSpotlight className="-top-40 left-0 md:left-60 md:-top-20" />
        <div className="relative z-10 px-8 pt-10 pb-8">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="pill-amber">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Live Intelligence
                </span>
              </div>
              <h1 className="display-heading text-3xl text-white">
                Demand Intelligence
                <span className="block text-base font-normal text-slate-500 mt-1.5" style={{ fontFamily: "Inter, sans-serif", letterSpacing: "normal" }}>
                  Blinkit dark store inventory · 10 locations · 50 SKUs
                </span>
              </h1>
            </div>
            {!loading && stats && (
              <div className="hidden xl:flex gap-4 text-center">
                {[
                  { label: "Critical",  value: criticalAlerts.length,  color: "text-red-400" },
                  { label: "Reorder",   value: reorderAlerts.length,   color: "text-amber-400" },
                  { label: "Model R²",  value: `${(stats.model_r2 * 100).toFixed(1)}%`, color: "text-blue-400" },
                ].map((m) => (
                  <div key={m.label} className="stat-chip">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">{m.label}</span>
                    <span className={`text-lg font-bold font-mono ${m.color}`}>{m.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-7 space-y-6">
        {/* Stockout urgency bar */}
        {(loading || urgentAlerts.length > 0) && (
          <div className="card border-red-500/10">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-red-400" />
              <h2 className="font-semibold text-white text-sm">Stockout Risk</h2>
              <span className="text-xs text-slate-600">Products running out within 5 days</span>
            </div>
            {loading ? (
              <div className="flex gap-2">{[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 w-36 rounded-full bg-bg-muted animate-pulse" />
              ))}</div>
            ) : urgentAlerts.length === 0 ? (
              <p className="text-sm text-emerald-400">No urgent stockouts detected.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {urgentAlerts.map((a) => {
                  const storeName = storeMap[a.store_id]?.name ?? `Store ${a.store_id}`;
                  return (
                    <a key={a._id} href="/inventory"
                      className={`inline-flex items-center gap-2 border rounded-full px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 ${urgencyColor(a.days_until_stockout)}`}>
                      <span>{a.item_name}</span>
                      <span className="opacity-60">·</span>
                      <span className="opacity-70 font-normal">{storeName.replace("Blinkit ", "")}</span>
                      <span className="opacity-60">·</span>
                      <span className="font-bold">{a.days_until_stockout <= 0 ? "OUT" : `${a.days_until_stockout}d`}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Active Alerts" value={loading ? "…" : stats?.active_alerts ?? "—"}
            sub={`${criticalAlerts.length} critical · ${reorderAlerts.length} reorder`}
            icon={AlertTriangle} accent="bg-amber-500/10 text-amber-400" border="rgba(245,158,11,0.2)" />
          <KpiCard
            label="Model R²" value={loading ? "…" : stats ? `${(stats.model_r2 * 100).toFixed(1)}%` : "—"}
            sub={`MAE ${stats?.model_mae ?? "—"} units avg`}
            icon={TrendingUp} accent="bg-blue-500/10 text-blue-400" border="rgba(59,130,246,0.2)" />
          <KpiCard
            label="Dark Stores" value={loading ? "…" : stats?.total_stores ?? "—"}
            sub="10 Blinkit locations"
            icon={StoreIcon} accent="bg-violet-500/10 text-violet-400" border="rgba(139,92,246,0.2)" />
          <KpiCard
            label="Stock Units" value={loading ? "…" : stats ? stats.total_stock_units.toLocaleString() : "—"}
            sub={`${stats?.stockout_count ?? 0} stockouts today`}
            icon={Package} accent="bg-emerald-500/10 text-emerald-400" border="rgba(16,185,129,0.2)" />
        </div>

        {/* Main content row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Active Alerts */}
          <div className="xl:col-span-2 card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h2 className="font-semibold text-white text-sm">Active Alerts</h2>
              </div>
              <span className="text-xs text-slate-600 font-mono border border-bg-muted px-2 py-0.5 rounded-full">
                {alerts.length} total
              </span>
            </div>
            {loading ? (
              <div className="py-8 flex items-center justify-center gap-2">
                <div className="loader" />
                <span className="text-slate-600 text-sm">Loading…</span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-slate-400 text-sm font-medium">All clear</p>
                <p className="text-slate-600 text-xs mt-1">No active inventory alerts</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {alerts.slice(0, 15).map((a) => (
                  <div key={a._id}
                    className={`border-l-2 rounded-r-xl px-4 py-3 ${ALERT_BORDER[a.alert_type] ?? "border-l-bg-muted"} ${ALERT_BG[a.alert_type] ?? "bg-bg-panel"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{a.item_name}</span>
                        <span className="text-xs text-slate-500">@ {storeMap[a.store_id]?.name ?? `Store ${a.store_id}`}</span>
                        <span className={SEGMENT_BADGE[a.sku_segment] ?? ""}>{a.sku_segment}</span>
                      </div>
                      <span className={`text-xs font-bold tracking-wider ${a.alert_type === "critical" ? "text-red-400" : "text-amber-400"}`}>
                        {a.alert_type.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                      <span>Stock: <b className="text-slate-300">{a.current_stock}</b></span>
                      <span>Reorder: <b className="text-slate-300">{a.reorder_point}</b></span>
                      <span>Stockout: <b className="text-amber-400">{a.days_until_stockout}d</b></span>
                      <span>Order: <b className="text-emerald-400">{a.recommended_order_qty} units</b></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <a href="/inventory" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors pt-1">
              View all in Inventory <ArrowRight className="w-3 h-3" />
            </a>
          </div>

          {/* Right column: Festival + Top Movers */}
          <div className="space-y-4">
            {/* Festival Spikes */}
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-violet-400" />
                <h2 className="font-semibold text-white text-sm">Upcoming Festival Spikes</h2>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-bg-muted animate-pulse" />)}
                </div>
              ) : events.length === 0 ? (
                <p className="text-xs text-slate-600 py-4">No festivals in the next 90 days</p>
              ) : (
                <div className="space-y-2">
                  {events.slice(0, 4).map((ev) => (
                    <div key={ev.name} className="rounded-xl border border-violet-500/10 bg-violet-500/5 px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-white">{ev.name}</span>
                        <span className={`text-xs font-mono font-bold ${ev.days_away <= 7 ? "text-red-400" : ev.days_away <= 21 ? "text-amber-400" : "text-slate-400"}`}>
                          {ev.days_away <= 0 ? "Today" : ev.days_away === 1 ? "Tomorrow" : `${ev.days_away}d`}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(ev.multipliers).map(([cat, mult]) => (
                          <span key={cat} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/20 ${MULT_COLOR(mult)}`}>
                            {cat} ↑{Math.round((mult - 1) * 100)}%
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Movers */}
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-accent-cyan" />
                <h2 className="font-semibold text-white text-sm">Top Products by Demand</h2>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-7 rounded-lg bg-bg-muted animate-pulse" />)}
                </div>
              ) : (
                <div className="space-y-1">
                  {topItems.map((item, i) => (
                    <div key={item._id} className="flex items-center gap-2.5 py-1.5 border-b border-bg-border/40 last:border-0">
                      <span className="text-[10px] text-slate-600 font-mono w-4 shrink-0">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-slate-300 truncate block">{item.name}</span>
                        <span className="text-[10px] text-slate-600 capitalize">{item.category}</span>
                      </div>
                      <span className="text-xs font-mono text-slate-400 shrink-0">
                        {item.avg_daily_sales.toFixed(0)}<span className="text-slate-600 text-[10px]">/d</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Store Performance */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <StoreIcon className="w-4 h-4 text-violet-400" />
            <h2 className="font-semibold text-white text-sm">Store Performance</h2>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-2">
            {[...stores].sort((a, b) => b.avg_daily_sales - a.avg_daily_sales).map((s, i) => (
              <div key={s._id}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-bg-border/40 bg-bg-panel/50 hover:border-bg-muted transition-colors">
                <span className={`w-2 h-2 rounded-full shrink-0 ${TIER_DOT[s.performance_tier] ?? "bg-slate-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium truncate">{s.name.replace("Blinkit ", "")}</p>
                  <p className="text-[10px] text-slate-600">{s.city}</p>
                </div>
                <span className="text-xs font-mono text-slate-500 shrink-0">
                  {s.avg_daily_sales.toFixed(0)}<span className="text-slate-700 text-[10px]">/d</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Model metrics strip */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "MAE",  value: loading ? "…" : stats?.model_mae ?? "—",  sub: "avg error (units)", color: "text-blue-400" },
            { label: "RMSE", value: loading ? "…" : stats?.model_rmse ?? "—", sub: "root mean sq error", color: "text-cyan-400" },
            { label: "R²",   value: loading ? "…" : stats ? (stats.model_r2 * 100).toFixed(2) + "%" : "—", sub: "variance explained", color: "text-violet-400" },
            { label: "MAPE", value: loading ? "…" : stats?.model_mape ?? "—", sub: "% avg error",       color: "text-emerald-400" },
          ].map((m) => (
            <div key={m.label} className="card text-center">
              <p className="section-title">{m.label}</p>
              <p className={`text-2xl font-bold mt-2 font-mono ${m.color}`}>{m.value}</p>
              <p className="text-xs text-slate-600 mt-0.5">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Model caveat */}
        <div className="flex items-start gap-3 bg-slate-800/20 border border-bg-border rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-600">
            <span className="text-slate-400 font-medium">Pattern-based forecasts</span> — LightGBM model trained on 2013-2017 retail data.
            Forecast dates are remapped to current timeline; seasonal and day-of-week patterns are preserved.
            Upload your own CSV on the <a href="/upload" className="text-slate-400 underline underline-offset-2 hover:text-white">Upload Data</a> page to power forecasts with real current sales history.
          </p>
        </div>
      </div>
    </div>
  );
}
