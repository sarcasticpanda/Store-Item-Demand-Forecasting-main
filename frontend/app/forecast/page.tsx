"use client";
import { useState, useEffect } from "react";
import { api, type ForecastResponse, type Store, type Item } from "@/lib/api";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingUp, Package, AlertTriangle, Activity, Zap, Info, Upload } from "lucide-react";

const HORIZON_OPTIONS = [7, 14, 30, 60, 90];
const SEG_BADGE: Record<string, string> = {
  fast: "badge-fast", slow: "badge-slow", premium: "badge-premium", essential: "badge-essential",
};
const STOCK_KEY = (storeId: number, itemId: number) => `inveniq_stock_${storeId}_${itemId}`;

export default function ForecastPage() {
  const [stores, setStores]     = useState<Store[]>([]);
  const [items, setItems]       = useState<Item[]>([]);
  const [storeId, setStoreId]   = useState(1);
  const [itemId, setItemId]     = useState(1);
  const [days, setDays]         = useState(30);
  const [stock, setStock]       = useState<string>("");
  const [data, setData]         = useState<ForecastResponse | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(false);
  const [showBase, setShowBase] = useState(true);

  // Load stores + items once
  useEffect(() => {
    api.stores().then(setStores).catch(() => {});
    api.items().then(setItems).catch(() => {});
  }, []);

  // Auto-load current_stock from inventory when store/item changes
  useEffect(() => {
    // First try localStorage for user-entered override
    const saved = localStorage.getItem(STOCK_KEY(storeId, itemId));
    if (saved !== null) { setStock(saved); return; }
    // Otherwise fetch from inventory
    api.inventory(storeId)
      .then((inv) => {
        const match = inv.find((r) => r.item_id === itemId);
        if (match) setStock(String(match.current_stock));
      })
      .catch(() => {});
  }, [storeId, itemId]);

  // Persist stock to localStorage when user changes it
  const handleStockChange = (val: string) => {
    setStock(val);
    localStorage.setItem(STOCK_KEY(storeId, itemId), val);
  };

  const load = async () => {
    setLoading(true); setError(false);
    try { setData(await api.forecast(storeId, itemId, days)); }
    catch { setData(null); setError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [storeId, itemId, days]);

  // Build chart data: historical + base + festival-adjusted
  const chartData = (() => {
    if (!data) return [];
    const hist = data.historical.slice(-60).map((h) => ({
      date: h.date.slice(5), // show MM-DD for compactness
      actual: h.actual_sales,
      base: null as number | null,
      adjusted: null as number | null,
      festival: null as string | null,
    }));
    const fore = data.forecast.map((f) => ({
      date: f.date.slice(5),
      actual: null as number | null,
      base: f.base_sales ?? f.predicted_sales,
      adjusted: f.predicted_sales,
      festival: f.festival ?? null,
    }));
    return [...hist, ...fore];
  })();

  // Festival reference lines within forecast range
  const festivalDates = data?.forecast
    .filter((f) => f.festival)
    .reduce<{ date: string; name: string }[]>((acc, f) => {
      if (!acc.find((x) => x.name === f.festival))
        acc.push({ date: f.date.slice(5), name: f.festival! });
      return acc;
    }, []) ?? [];

  const splitDate       = data?.forecast[0]?.date.slice(5);
  const totalForecast   = data?.forecast.reduce((s, f) => s + f.predicted_sales, 0) ?? 0;
  const avgForecast     = data ? totalForecast / data.forecast.length : 0;
  const stockNum        = parseFloat(stock);
  const hasStock        = !isNaN(stockNum) && stockNum >= 0;
  const daysLeft        = hasStock && avgForecast > 0 ? Math.floor(stockNum / avgForecast) : null;
  const deficit         = hasStock ? stockNum - totalForecast : null;
  const selectedItem    = items.find((i) => i._id === itemId);
  const selectedStore   = stores.find((s) => s._id === storeId);
  const needRestock     = hasStock && deficit !== null && deficit < 0;
  const hasFestival     = festivalDates.length > 0;

  return (
    <div className="relative min-h-screen">
      {/* Page header */}
      <div className="px-8 pt-8 pb-6 border-b border-bg-border"
        style={{ background: "linear-gradient(180deg, rgba(6,182,212,0.04) 0%, transparent 100%)" }}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-accent-cyan border border-accent-cyan/30 bg-accent-cyan/5 px-3 py-1 rounded-full">
            <TrendingUp className="w-3 h-3" />
            LightGBM Forecast
          </span>
          {data?.dates_remapped && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-amber-400 border border-amber-400/30 bg-amber-400/5 px-3 py-1 rounded-full">
              <Info className="w-3 h-3" />
              Dates remapped to current timeline
            </span>
          )}
          {data?.has_user_data && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-400 border border-emerald-400/30 bg-emerald-400/5 px-3 py-1 rounded-full">
              <Upload className="w-3 h-3" />
              Using your uploaded data
            </span>
          )}
          {hasFestival && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-violet-400 border border-violet-400/30 bg-violet-400/5 px-3 py-1 rounded-full">
              Festival demand boost applied
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Demand Forecast</h1>
        <p className="text-slate-500 text-sm mt-1">
          {selectedStore && selectedItem
            ? `${selectedStore.name} · ${selectedItem.name} · ${days}-day horizon`
            : "Configure a store and item to see demand predictions"}
        </p>
      </div>

      <div className="px-8 py-7 space-y-6">
        {/* Controls row */}
        <div className="card flex flex-wrap gap-5 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Store</label>
            <select value={storeId} onChange={(e) => setStoreId(+e.target.value)} className="select">
              {stores.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Product</label>
            <select value={itemId} onChange={(e) => setItemId(+e.target.value)} className="select">
              {items.map((i) => <option key={i._id} value={i._id}>{i.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Horizon</label>
            <div className="flex gap-1">
              {HORIZON_OPTIONS.map((d) => (
                <button key={d} onClick={() => setDays(d)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
                    days === d
                      ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                      : "border border-bg-muted text-slate-500 hover:text-slate-200 hover:border-slate-600"
                  }`}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Current Stock <span className="text-slate-600 normal-case">(auto-loaded)</span>
            </label>
            <input type="number" min={0} value={stock} onChange={(e) => handleStockChange(e.target.value)}
              placeholder="Units in store" className="input w-40" />
          </div>
          {selectedItem && (
            <div className="flex flex-col gap-1.5 ml-auto">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">SKU Segment</label>
              <div className="flex items-center gap-2 h-9">
                <span className={SEG_BADGE[selectedItem.sku_segment] ?? ""}>{selectedItem.sku_segment}</span>
                <span className="text-xs text-slate-600 font-mono">CV {selectedItem.cv}</span>
                {selectedItem.unit_cost && (
                  <span className="text-xs text-slate-600">₹{selectedItem.unit_cost}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reorder alert banner */}
        {needRestock && (
          <div className="flex items-center gap-4 bg-red-500/8 border border-red-500/25 rounded-xl px-5 py-4">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-300">Restock Required</p>
              <p className="text-xs text-red-400/70 mt-0.5">
                At current forecast demand you need to order{" "}
                <b className="text-red-300">{Math.abs(deficit!).toFixed(0)} units</b> to cover the next {days} days.
                {daysLeft !== null && ` Current stock covers ~${daysLeft} day${daysLeft !== 1 ? "s" : ""}.`}
                {hasFestival && " Festival demand boost included."}
              </p>
            </div>
          </div>
        )}
        {hasStock && daysLeft !== null && !needRestock && (
          <div className="flex items-center gap-4 bg-emerald-500/6 border border-emerald-500/20 rounded-xl px-5 py-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-sm text-emerald-300">
              Stock sufficient — <b>{Math.abs(deficit!).toFixed(0)} units surplus</b> over the {days}-day horizon.
              {daysLeft !== null && ` Stock lasts ~${daysLeft} days.`}
            </p>
          </div>
        )}

        {/* KPI strip */}
        {data && (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "Total Forecast", value: totalForecast.toFixed(0), sub: `units / ${days} days`, color: "text-accent-cyan" },
              { label: "Avg Daily",      value: avgForecast.toFixed(1),    sub: "units per day",        color: "text-white" },
              ...(hasStock && daysLeft !== null ? [{
                label: "Days of Stock",
                value: String(daysLeft),
                sub: "until stockout",
                color: daysLeft < 7 ? "text-red-400" : daysLeft < 14 ? "text-amber-400" : "text-emerald-400",
              }] : []),
              ...(hasStock && deficit !== null ? [{
                label: deficit < 0 ? "Order Needed" : "Stock Surplus",
                value: Math.abs(deficit).toFixed(0),
                sub: deficit < 0 ? "units to order" : "units excess",
                color: deficit < 0 ? "text-red-400" : "text-emerald-400",
              }] : []),
            ].map((m) => (
              <div key={m.label} className="card text-center group">
                <p className="section-title">{m.label}</p>
                <p className={`text-2xl font-bold mt-2 font-mono ${m.color}`}>{m.value}</p>
                <p className="text-xs text-slate-600 mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent-cyan" />
              <h2 className="font-semibold text-white text-sm">Historical Sales + Demand Forecast</h2>
            </div>
            <div className="flex items-center gap-3">
              {hasFestival && (
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={showBase} onChange={(e) => setShowBase(e.target.checked)}
                    className="w-3 h-3 accent-violet-500" />
                  <span className="text-[11px] text-slate-500">Show base demand</span>
                </label>
              )}
              {loading && <div className="loader" />}
            </div>
          </div>

          {/* Festival legend strip */}
          {hasFestival && (
            <div className="flex flex-wrap gap-2 mb-4">
              {festivalDates.map((f) => (
                <span key={f.name} className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300">
                  🎉 {f.name}
                </span>
              ))}
            </div>
          )}

          {error ? (
            <div className="h-72 flex flex-col items-center justify-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-400/50" />
              <p className="text-slate-500 text-sm">Failed to load forecast — check backend connection</p>
              <button onClick={load} className="btn-ghost text-xs">Retry</button>
            </div>
          ) : !data && !loading ? (
            <div className="h-72 flex items-center justify-center text-slate-600 text-sm">Select a store and product above</div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="foreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#64748b" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,33,48,0.8)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false}
                  interval={Math.max(1, Math.floor(chartData.length / 8))} />
                <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} width={35} />
                <Tooltip
                  contentStyle={{ background: "rgba(15,17,23,0.95)", border: "1px solid rgba(30,33,48,0.9)", borderRadius: 10, fontSize: 12, padding: "8px 12px" }}
                  labelStyle={{ color: "#94a3b8", marginBottom: 4 }}
                  itemStyle={{ color: "#e2e8f0" }}
                  cursor={{ stroke: "rgba(255,255,255,0.07)" }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#64748b", paddingTop: 8 }} />
                {/* Forecast start marker */}
                {splitDate && (
                  <ReferenceLine x={splitDate} stroke="rgba(139,92,246,0.5)" strokeDasharray="4 4"
                    label={{ value: "Forecast Start", fill: "#7c3aed", fontSize: 10, dy: -6 }} />
                )}
                {/* Festival markers */}
                {festivalDates.map((f) => (
                  <ReferenceLine key={f.name} x={f.date} stroke="rgba(245,158,11,0.4)" strokeDasharray="3 3"
                    label={{ value: f.name, fill: "#d97706", fontSize: 9, dy: 12 }} />
                ))}
                <Area dataKey="actual"   name="Actual Sales"     stroke="#475569" fill="url(#actGrad)" dot={false} strokeWidth={1.5} connectNulls={false} />
                {/* Base demand — dashed, only shown if festival active and toggle on */}
                {hasFestival && showBase && (
                  <Line dataKey="base" name="Base Demand" stroke="#64748b" dot={false} strokeWidth={1.5}
                    strokeDasharray="5 3" connectNulls={false} />
                )}
                <Area dataKey="adjusted" name="Festival-Adjusted Forecast" stroke="#06b6d4" fill="url(#foreGrad)" dot={false} strokeWidth={2} connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          {/* Model caveat */}
          <p className="text-[10px] text-slate-700 mt-3 text-right">
            Pattern model trained on 2013-2017 retail data.
            {data?.dates_remapped && " Dates remapped to current timeline — seasonal patterns preserved."}
            {data?.has_user_data && " Forecast incorporates your uploaded sales history."}
          </p>
        </div>
      </div>
    </div>
  );
}
