"use client";
import { useState, useEffect } from "react";
import { api, type ModelMetrics, type ErrorRecord, type FeatureImportance, type SkuSummary } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { BarChart3, TrendingUp, Layers, Zap } from "lucide-react";

const SKU_COLORS: Record<string, string> = {
  fast: "#10b981", slow: "#64748b", premium: "#8b5cf6", essential: "#f59e0b",
};
const SKU_BG: Record<string, string> = {
  fast: "rgba(16,185,129,0.1)", slow: "rgba(100,116,139,0.1)",
  premium: "rgba(139,92,246,0.1)", essential: "rgba(245,158,11,0.1)",
};
const SKU_BORDER: Record<string, string> = {
  fast: "rgba(16,185,129,0.25)", slow: "rgba(100,116,139,0.25)",
  premium: "rgba(139,92,246,0.25)", essential: "rgba(245,158,11,0.25)",
};
const TOOLTIP_STYLE = {
  contentStyle: { background: "rgba(9,10,13,0.97)", border: "1px solid rgba(30,33,48,0.9)", borderRadius: 10, fontSize: 12, padding: "8px 12px" },
  labelStyle: { color: "#64748b", marginBottom: 4 },
  itemStyle: { color: "#e2e8f0" },
  cursor: { fill: "rgba(255,255,255,0.03)" },
};

export default function AnalyticsPage() {
  const [byStore, setByStore]     = useState<ErrorRecord[]>([]);
  const [byItem, setByItem]       = useState<ErrorRecord[]>([]);
  const [features, setFeatures]   = useState<FeatureImportance[]>([]);
  const [sku, setSku]             = useState<SkuSummary[]>([]);
  const [metrics, setMetrics]     = useState<ModelMetrics | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      api.errorByStore().catch(() => []),
      api.errorByItem().catch(() => []),
      api.featureImportance().catch(() => []),
      api.skuSummary().catch(() => []),
      api.modelMetrics().catch(() => null),
    ]).then(([bs, bi, feat, sk, m]) => {
      setByStore(bs); setByItem(bi); setFeatures(feat); setSku(sk); setMetrics(m);
      setLoading(false);
    });
  }, []);

  const storeData = byStore
    .map((r: any) => ({ name: `S${r.store}`, mae: parseFloat((r.mae * 100).toFixed(2)) }))
    .sort((a, b) => b.mae - a.mae);

  const featData = features
    .map((f: any) => ({ name: (f.feature ?? "")?.replace(/_/g, " "), importance: +(f.importance ?? f.value ?? 0) }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 15);

  return (
    <div className="relative min-h-screen">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-bg-border"
        style={{ background: "linear-gradient(180deg, rgba(139,92,246,0.04) 0%, transparent 100%)" }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-accent-violet border border-accent-violet/30 bg-accent-violet/5 px-3 py-1 rounded-full">
            <BarChart3 className="w-3 h-3" />
            Model Analytics
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Model performance, error analysis, and SKU intelligence</p>
      </div>

      <div className="px-8 py-7 space-y-7">
        {/* Model metric cards */}
        {metrics && (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "MAE",  value: metrics.mae,                          sub: "mean abs error (units)", color: "text-blue-400"    },
              { label: "RMSE", value: metrics.rmse,                         sub: "root mean sq error",     color: "text-cyan-400"    },
              { label: "R²",   value: (metrics.r2 * 100).toFixed(2) + "%", sub: "variance explained",      color: "text-violet-400"  },
              { label: "MAPE", value: metrics.mape + "%",                   sub: "mean abs % error",        color: "text-emerald-400" },
            ].map((m) => (
              <div key={m.label} className="card text-center">
                <p className="section-title">{m.label}</p>
                <p className={`text-3xl font-bold mt-2 font-mono ${m.color}`}>{m.value}</p>
                <p className="text-xs text-slate-600 mt-1">{m.sub}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <div className="loader" />
            <span className="text-slate-500 text-sm">Loading analytics…</span>
          </div>
        ) : (
          <>
            {/* Charts row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="card">
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <h2 className="font-semibold text-white text-sm">MAE by Store (×100)</h2>
                </div>
                {storeData.length === 0 ? (
                  <p className="text-slate-600 text-sm text-center py-12">Run training to generate store error data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={storeData} layout="vertical" margin={{ left: 10, right: 20, top: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,33,48,0.8)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Bar dataKey="mae" name="MAE ×100" radius={[0, 4, 4, 0]}>
                        {storeData.map((_: any, i: number) => (
                          <Cell key={i} fill={i < 3 ? "#ef4444" : i < 6 ? "#f59e0b" : "#10b981"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="card">
                <div className="flex items-center gap-2 mb-5">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <h2 className="font-semibold text-white text-sm">Top 15 Feature Importances</h2>
                </div>
                {featData.length === 0 ? (
                  <p className="text-slate-600 text-sm text-center py-12">No feature importance data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={featData} layout="vertical" margin={{ left: 10, right: 20, top: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,33,48,0.8)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} width={90} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Bar dataKey="importance" fill="#06b6d4" name="Importance" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* SKU Segment Summary */}
            <div className="card">
              <div className="flex items-center gap-2 mb-5">
                <Layers className="w-4 h-4 text-violet-400" />
                <h2 className="font-semibold text-white text-sm">SKU Segment Breakdown</h2>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {sku.map((s) => (
                  <div key={s.segment} className="rounded-xl p-4 border"
                    style={{ background: SKU_BG[s.segment] ?? "rgba(15,17,23,0.5)", borderColor: SKU_BORDER[s.segment] ?? "rgba(30,33,48,0.8)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="capitalize text-sm font-bold" style={{ color: SKU_COLORS[s.segment] ?? "#94a3b8" }}>{s.segment}</span>
                      <span className="text-2xl font-bold text-white font-mono">{s.count}</span>
                    </div>
                    <p className="text-xs text-slate-500">Avg daily: <span className="text-slate-300 font-semibold">{s.avg_daily_sales}</span> units</p>
                    <p className="text-xs text-slate-500 mt-0.5">Avg CV: <span className="text-slate-300 font-semibold">{s.avg_cv}</span></p>
                  </div>
                ))}
              </div>
            </div>

            {/* Error heatmap */}
            <div className="card">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-4 h-4 text-red-400" />
                <h2 className="font-semibold text-white text-sm">MAE by Item — Top 20 Worst</h2>
              </div>
              {byItem.length === 0 ? (
                <p className="text-slate-600 text-sm text-center py-8">No item-level error data yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {byItem.slice(0, 20).map((r: any) => {
                    const intensity = Math.min(r.mae / 0.22, 1);
                    return (
                      <div key={r.item_id} className="rounded-xl px-3 py-2.5 text-center min-w-[76px] border border-white/5"
                        style={{ background: `rgba(239,68,68,${0.07 + intensity * 0.55})` }}>
                        <p className="text-[10px] text-slate-500 font-mono">Item {r.item_id}</p>
                        <p className="text-sm font-bold text-white font-mono">{(r.mae * 100).toFixed(1)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
