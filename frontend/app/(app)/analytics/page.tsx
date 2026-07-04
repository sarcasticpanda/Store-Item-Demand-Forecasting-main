"use client";
import { useState, useEffect } from "react";
import { api, type ModelMetrics, type ErrorRecord, type FeatureImportance, type SkuSummary } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { BarChart3, TrendingUp, Layers, Zap } from "lucide-react";

const SKU_TAG: Record<string, string> = {
  fast: "tag-green", slow: "tag-ink", premium: "pill-violet", essential: "tag-amber",
};
const TOOLTIP_STYLE = {
  contentStyle: { background: "#0E2A2E", border: "1px solid #2C4F52", borderRadius: 6, fontSize: 12, padding: "8px 12px", color: "#F4F1EA" },
  labelStyle: { color: "#B8C4BF", marginBottom: 4 },
  itemStyle: { color: "#F4F1EA" },
  cursor: { fill: "rgba(242,101,34,0.06)" },
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
      {/* Masthead */}
      <header className="px-8 pt-8 pb-6 bg-surface" style={{ borderBottom: "1px solid var(--rule-strong)" }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="pill-violet"><BarChart3 className="w-3 h-3" /> Model Analytics</span>
        </div>
        <h1 className="display-heading text-3xl">Analytics</h1>
        <p className="text-ink-3 text-sm mt-1.5 font-mono">Model performance · error analysis · SKU intelligence</p>
      </header>

      <div className="px-8 py-7 space-y-6">
        {/* Metric cards */}
        {metrics && (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "MAE",  value: metrics.mae,                          sub: "mean abs error (units)", color: "text-brand"    },
              { label: "RMSE", value: metrics.rmse,                         sub: "root mean sq error",     color: "text-sig-blue" },
              { label: "R²",   value: (metrics.r2 * 100).toFixed(2) + "%", sub: "variance explained",      color: "text-ink"      },
              { label: "MAPE", value: metrics.mape + "%",                   sub: "mean abs % error",        color: "text-sig-green"},
            ].map((m) => (
              <div key={m.label} className="card text-center">
                <p className="eyebrow">{m.label}</p>
                <p className={`figure text-3xl mt-2 ${m.color}`}>{m.value}</p>
                <p className="text-xs text-ink-3 mt-1">{m.sub}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <div className="loader" /><span className="text-ink-3 text-sm">Loading analytics…</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="section-title mb-5"><TrendingUp className="w-3.5 h-3.5" /> MAE by Store (×100)</h2>
                {storeData.length === 0 ? (
                  <p className="text-ink-3 text-sm text-center py-12">Run training to generate store error data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={storeData} layout="vertical" margin={{ left: 10, right: 20, top: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,241,234,0.09)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#7E908B", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "#B8C4BF", fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Bar dataKey="mae" name="MAE ×100" radius={[0, 3, 3, 0]}>
                        {storeData.map((_: any, i: number) => (
                          <Cell key={i} fill={i < 3 ? "#F87171" : i < 6 ? "#F5A524" : "#34D399"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="card">
                <h2 className="section-title mb-5"><Zap className="w-3.5 h-3.5" /> Top 15 Feature Importances</h2>
                {featData.length === 0 ? (
                  <p className="text-ink-3 text-sm text-center py-12">No feature importance data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={featData} layout="vertical" margin={{ left: 10, right: 20, top: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,241,234,0.09)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "#7E908B", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "#B8C4BF", fontSize: 10 }} tickLine={false} axisLine={false} width={90} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Bar dataKey="importance" fill="#F26522" name="Importance" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* SKU segment */}
            <div className="card">
              <h2 className="section-title mb-5"><Layers className="w-3.5 h-3.5" /> SKU Segment Breakdown</h2>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {sku.map((s) => (
                  <div key={s.segment} className="rounded p-4 bg-panel border border-rule">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`tag ${SKU_TAG[s.segment] ?? "tag-ink"} capitalize`}>{s.segment}</span>
                      <span className="figure text-2xl">{s.count}</span>
                    </div>
                    <p className="text-xs text-ink-3">Avg daily: <span className="text-ink font-semibold font-mono">{s.avg_daily_sales}</span> units</p>
                    <p className="text-xs text-ink-3 mt-0.5">Avg CV: <span className="text-ink font-semibold font-mono">{s.avg_cv}</span></p>
                  </div>
                ))}
              </div>
            </div>

            {/* Error heatmap */}
            <div className="card">
              <h2 className="section-title mb-5"><BarChart3 className="w-3.5 h-3.5" /> MAE by Item — Top 20 Worst</h2>
              {byItem.length === 0 ? (
                <p className="text-ink-3 text-sm text-center py-8">No item-level error data yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {byItem.slice(0, 20).map((r: any) => {
                    const intensity = Math.min(r.mae / 0.22, 1);
                    return (
                      <div key={r.item_id} className="rounded px-3 py-2.5 text-center min-w-[76px] border border-rule"
                        style={{ background: `rgba(248,113,113,${0.08 + intensity * 0.34})` }}>
                        <p className="text-[10px] text-ink-3 font-mono">Item {r.item_id}</p>
                        <p className="figure text-sm mt-0.5">{(r.mae * 100).toFixed(1)}</p>
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
