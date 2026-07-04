"use client";
import { useState, useEffect } from "react";
import { api, type DashboardStats, type Alert, type Store, type Item, type FestivalEvent } from "@/lib/api";
import { AlertTriangle, TrendingUp, Package, Store as StoreIcon, Activity, ArrowRight, Calendar, Flame, Info } from "lucide-react";

const SEGMENT_BADGE: Record<string, string> = {
  fast: "badge-fast", slow: "badge-slow", premium: "badge-premium", essential: "badge-essential",
};
const ALERT_RAIL: Record<string, string> = { critical: "rail-red", reorder: "rail-amber" };
const TIER_DOT: Record<string, string> = { high: "bg-sig-green", medium: "bg-sig-amber", low: "bg-sig-red" };
const MULT_COLOR = (m: number) => m >= 1.5 ? "tag-red" : m >= 1.3 ? "tag-amber" : "tag-green";

function KpiCard({ label, value, sub, icon: Icon, rail, delay = 0 }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; rail: string; delay?: number;
}) {
  return (
    <div className={`card-flat ${rail} flex items-start gap-3.5 rise`} style={{ animationDelay: `${delay}s` }}>
      <div className="w-9 h-9 rounded flex items-center justify-center shrink-0 bg-panel border border-rule">
        <Icon className="w-4 h-4 text-ink-2" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="eyebrow">{label}</p>
        <p className="figure text-2xl mt-1">{value}</p>
        {sub && <p className="text-ink-3 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats]   = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [items, setItems]   = useState<Item[]>([]);
  const [events, setEvents] = useState<FestivalEvent[]>([]);
  const [loading, setLoading] = useState(true);

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
  const criticalAlerts = alerts.filter((a) => a.alert_type === "critical");
  const reorderAlerts  = alerts.filter((a) => a.alert_type === "reorder");

  const urgentAlerts = [...alerts]
    .filter((a) => a.days_until_stockout <= 5)
    .sort((a, b) => a.days_until_stockout - b.days_until_stockout)
    .slice(0, 8);

  const topItems = [...items].sort((a, b) => b.avg_daily_sales - a.avg_daily_sales).slice(0, 8);

  const urgencyTag = (d: number) => d <= 1 ? "tag-red" : d <= 3 ? "tag-amber" : "tag-ink";

  return (
    <div className="relative min-h-screen">
      {/* ── Masthead ─────────────────────────────────────────── */}
      <header className="px-8 pt-8 pb-6 bg-surface" style={{ borderBottom: "1px solid var(--rule-strong)" }}>
        <div className="flex items-start justify-between flex-wrap gap-5">
          <div className="rise">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="pill-green">
                <span className="w-1.5 h-1.5 rounded-full bg-sig-green animate-pulse-slow" />
                Live
              </span>
              <span className="eyebrow">Demand Operations Terminal</span>
            </div>
            <h1 className="display-heading text-4xl leading-none">Demand Intelligence</h1>
            <p className="text-sm text-ink-3 mt-2 font-mono">
              Blinkit dark-store inventory · 10 locations · 50 SKUs
            </p>
          </div>
          {!loading && stats && (
            <div className="flex gap-3">
              {[
                { label: "Critical",  value: criticalAlerts.length, tag: "text-sig-red" },
                { label: "Reorder",   value: reorderAlerts.length,  tag: "text-sig-amber" },
                { label: "Model R²",  value: `${(stats.model_r2 * 100).toFixed(1)}%`, tag: "text-brand" },
              ].map((m) => (
                <div key={m.label} className="stat-chip min-w-[92px]">
                  <span className="eyebrow">{m.label}</span>
                  <span className={`figure text-lg ${m.tag}`}>{m.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="px-8 py-7 space-y-6">
        {/* ── Stockout risk ──────────────────────────────────── */}
        {(loading || urgentAlerts.length > 0) && (
          <section className="card rail-red">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-sig-red" />
              <h2 className="section-title !text-ink">Stockout Risk</h2>
              <span className="text-xs text-ink-3">— running out within 5 days</span>
            </div>
            {loading ? (
              <div className="flex gap-2">{[...Array(4)].map((_, i) => <div key={i} className="h-7 w-36 skeleton" />)}</div>
            ) : urgentAlerts.length === 0 ? (
              <p className="text-sm text-sig-green">No urgent stockouts detected.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {urgentAlerts.map((a) => {
                  const storeName = (storeMap[a.store_id]?.name ?? `Store ${a.store_id}`).replace("Blinkit ", "");
                  return (
                    <a key={a._id} href="/inventory" className={`tag ${urgencyTag(a.days_until_stockout)} hover:opacity-80`}>
                      <span className="font-sans font-semibold">{a.item_name}</span>
                      <span className="opacity-50">·</span>
                      <span className="opacity-80 font-normal">{storeName}</span>
                      <span className="opacity-50">·</span>
                      <span>{a.days_until_stockout <= 0 ? "OUT" : `${a.days_until_stockout}d`}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── KPI row ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard label="Active Alerts" value={loading ? "…" : stats?.active_alerts ?? "—"}
            sub={`${criticalAlerts.length} critical · ${reorderAlerts.length} reorder`}
            icon={AlertTriangle} rail="rail-amber" delay={0} />
          <KpiCard label="Model R²" value={loading ? "…" : stats ? `${(stats.model_r2 * 100).toFixed(1)}%` : "—"}
            sub={`MAE ${stats?.model_mae ?? "—"} units avg`} icon={TrendingUp} rail="rail-brand" delay={0.06} />
          <KpiCard label="Dark Stores" value={loading ? "…" : stats?.total_stores ?? "—"}
            sub="10 Blinkit locations" icon={StoreIcon} rail="rail-blue" delay={0.12} />
          <KpiCard label="Stock Units" value={loading ? "…" : stats ? stats.total_stock_units.toLocaleString() : "—"}
            sub={`${stats?.stockout_count ?? 0} stockouts today`} icon={Package} rail="rail-green" delay={0.18} />
        </div>

        {/* ── Main row ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Active alerts */}
          <div className="xl:col-span-2 card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="section-title"><AlertTriangle className="w-3.5 h-3.5" /> Active Alerts</h2>
              <span className="tag tag-ink">{alerts.length} total</span>
            </div>
            {loading ? (
              <div className="py-8 flex items-center justify-center gap-2">
                <div className="loader" /><span className="text-ink-3 text-sm">Loading…</span>
              </div>
            ) : alerts.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-10 h-10 rounded bg-panel border border-rule flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-5 h-5 text-sig-green" />
                </div>
                <p className="text-ink-2 text-sm font-medium">All clear</p>
                <p className="text-ink-3 text-xs mt-1">No active inventory alerts</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {alerts.slice(0, 15).map((a) => (
                  <div key={a._id} className={`bg-panel rounded pl-3.5 pr-4 py-2.5 ${ALERT_RAIL[a.alert_type] ?? "rail-blue"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink">{a.item_name}</span>
                        <span className="text-xs text-ink-3">@ {storeMap[a.store_id]?.name ?? `Store ${a.store_id}`}</span>
                        <span className={SEGMENT_BADGE[a.sku_segment] ?? ""}>{a.sku_segment}</span>
                      </div>
                      <span className={`tag ${a.alert_type === "critical" ? "tag-red" : "tag-amber"}`}>
                        {a.alert_type.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-ink-3 font-mono">
                      <span>Stock <b className="text-ink font-semibold">{a.current_stock}</b></span>
                      <span>Reorder <b className="text-ink font-semibold">{a.reorder_point}</b></span>
                      <span>Stockout <b className="text-sig-amber">{a.days_until_stockout}d</b></span>
                      <span>Order <b className="text-sig-green">{a.recommended_order_qty}u</b></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <a href="/inventory" className="inline-flex items-center gap-1 text-xs text-brand hover:underline pt-1 font-medium">
              View all in Inventory <ArrowRight className="w-3 h-3" />
            </a>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div className="card">
              <h2 className="section-title mb-3"><Calendar className="w-3.5 h-3.5" /> Festival Spikes</h2>
              {loading ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 skeleton" />)}</div>
              ) : events.length === 0 ? (
                <p className="text-xs text-ink-3 py-4">No festivals in the next 90 days</p>
              ) : (
                <div className="space-y-2">
                  {events.slice(0, 4).map((ev) => (
                    <div key={ev.name} className="rounded bg-panel border border-rule px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-ink">{ev.name}</span>
                        <span className={`font-mono text-xs font-semibold ${ev.days_away <= 7 ? "text-sig-red" : ev.days_away <= 21 ? "text-sig-amber" : "text-ink-3"}`}>
                          {ev.days_away <= 0 ? "Today" : ev.days_away === 1 ? "1d" : `${ev.days_away}d`}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(ev.multipliers).map(([cat, mult]) => (
                          <span key={cat} className={`tag ${MULT_COLOR(mult)}`}>
                            {cat} ↑{Math.round((mult - 1) * 100)}%
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="section-title mb-3"><TrendingUp className="w-3.5 h-3.5" /> Top Products by Demand</h2>
              {loading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-7 skeleton" />)}</div>
              ) : (
                <div className="space-y-0">
                  {topItems.map((item, i) => (
                    <div key={item._id} className="flex items-center gap-2.5 py-1.5" style={{ borderBottom: i < topItems.length - 1 ? "1px solid var(--rule)" : "none" }}>
                      <span className="text-[10px] text-ink-4 font-mono w-5 shrink-0 tnum">{String(i + 1).padStart(2, "0")}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-ink truncate block font-medium">{item.name}</span>
                        <span className="text-[10px] text-ink-3 capitalize">{item.category}</span>
                      </div>
                      <span className="text-xs font-mono text-ink-2 shrink-0 tnum">
                        {item.avg_daily_sales.toFixed(0)}<span className="text-ink-4 text-[10px]">/d</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Store performance ──────────────────────────────── */}
        <div className="card">
          <h2 className="section-title mb-4"><StoreIcon className="w-3.5 h-3.5" /> Store Performance</h2>
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-2">
            {[...stores].sort((a, b) => b.avg_daily_sales - a.avg_daily_sales).map((s) => (
              <div key={s._id} className="flex items-center gap-2.5 px-3 py-2.5 rounded border border-rule bg-panel">
                <span className={`w-2 h-2 rounded-full shrink-0 ${TIER_DOT[s.performance_tier] ?? "bg-ink-4"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ink font-medium truncate">{s.name.replace("Blinkit ", "")}</p>
                  <p className="text-[10px] text-ink-3">{s.city}</p>
                </div>
                <span className="text-xs font-mono text-ink-2 shrink-0 tnum">
                  {s.avg_daily_sales.toFixed(0)}<span className="text-ink-4 text-[10px]">/d</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Model metrics strip ────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "MAE",  value: loading ? "…" : stats?.model_mae ?? "—",  sub: "avg error (units)" },
            { label: "RMSE", value: loading ? "…" : stats?.model_rmse ?? "—", sub: "root mean sq error" },
            { label: "R²",   value: loading ? "…" : stats ? (stats.model_r2 * 100).toFixed(2) + "%" : "—", sub: "variance explained" },
            { label: "MAPE", value: loading ? "…" : stats?.model_mape ?? "—", sub: "% avg error" },
          ].map((m) => (
            <div key={m.label} className="card text-center">
              <p className="eyebrow">{m.label}</p>
              <p className="figure text-2xl mt-2">{m.value}</p>
              <p className="text-xs text-ink-3 mt-0.5">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Caveat ─────────────────────────────────────────── */}
        <div className="flex items-start gap-3 bg-panel border border-rule rounded px-4 py-3">
          <Info className="w-4 h-4 text-ink-3 shrink-0 mt-0.5" />
          <p className="text-[11px] text-ink-3 leading-relaxed">
            <span className="text-ink-2 font-semibold">Pattern-based forecasts</span> — LightGBM trained on 2013–2017 retail data.
            Forecast dates are remapped to the current timeline; seasonal and day-of-week patterns are preserved.
            Upload your own CSV on the <a href="/upload" className="text-brand underline underline-offset-2">Upload Data</a> page to power forecasts with real current sales history.
          </p>
        </div>
      </div>
    </div>
  );
}
