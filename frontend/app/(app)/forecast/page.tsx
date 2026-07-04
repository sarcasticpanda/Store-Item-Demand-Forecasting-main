"use client";
import { useState, useEffect } from "react";
import { api, type ForecastResponse, type Store, type Item } from "@/lib/api";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingUp, AlertTriangle, Activity, Zap, Info, Upload } from "lucide-react";

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

  useEffect(() => {
    api.stores().then(setStores).catch(() => {});
    api.items().then(setItems).catch(() => {});
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STOCK_KEY(storeId, itemId));
    if (saved !== null) { setStock(saved); return; }
    api.inventory(storeId)
      .then((inv) => {
        const match = inv.find((r) => r.item_id === itemId);
        if (match) setStock(String(match.current_stock));
      })
      .catch(() => {});
  }, [storeId, itemId]);

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

  const chartData = (() => {
    if (!data) return [];
    const hist = data.historical.slice(-60).map((h) => ({
      date: h.date.slice(5),
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
      {/* Masthead */}
      <header className="px-8 pt-8 pb-6 bg-surface" style={{ borderBottom: "1px solid var(--rule-strong)" }}>
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span className="pill-brand"><TrendingUp className="w-3 h-3" /> LightGBM Forecast</span>
          {data?.dates_remapped && (
            <span className="pill-amber"><Info className="w-3 h-3" /> Dates remapped to current timeline</span>
          )}
          {data?.has_user_data && (
            <span className="pill-green"><Upload className="w-3 h-3" /> Using your uploaded data</span>
          )}
          {hasFestival && <span className="pill-violet">Festival demand boost applied</span>}
        </div>
        <h1 className="display-heading text-3xl">Demand Forecast</h1>
        <p className="text-ink-3 text-sm mt-1.5 font-mono">
          {selectedStore && selectedItem
            ? `${selectedStore.name} · ${selectedItem.name} · ${days}-day horizon`
            : "Configure a store and item to see demand predictions"}
        </p>
      </header>

      <div className="px-8 py-7 space-y-6">
        {/* Controls */}
        <div className="card flex flex-wrap gap-5 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="eyebrow">Store</label>
            <select value={storeId} onChange={(e) => setStoreId(+e.target.value)} className="select">
              {stores.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="eyebrow">Product</label>
            <select value={itemId} onChange={(e) => setItemId(+e.target.value)} className="select">
              {items.map((i) => <option key={i._id} value={i._id}>{i.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="eyebrow">Horizon</label>
            <div className="flex gap-1">
              {HORIZON_OPTIONS.map((d) => (
                <button key={d} onClick={() => setDays(d)}
                  className={`px-3 py-2 rounded text-xs font-semibold font-mono transition-colors ${
                    days === d
                      ? "bg-brand-soft text-brand border border-brand/40"
                      : "border border-rule-strong text-ink-3 hover:text-ink hover:border-ink-3"
                  }`}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="eyebrow">Current Stock <span className="text-ink-4 normal-case">(auto-loaded)</span></label>
            <input type="number" min={0} value={stock} onChange={(e) => handleStockChange(e.target.value)}
              placeholder="Units in store" className="input w-40" />
          </div>
          {selectedItem && (
            <div className="flex flex-col gap-1.5 ml-auto">
              <label className="eyebrow">SKU Segment</label>
              <div className="flex items-center gap-2 h-9">
                <span className={SEG_BADGE[selectedItem.sku_segment] ?? ""}>{selectedItem.sku_segment}</span>
                <span className="text-xs text-ink-3 font-mono">CV {selectedItem.cv}</span>
                {selectedItem.unit_cost && <span className="text-xs text-ink-3 font-mono">₹{selectedItem.unit_cost}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Restock banners */}
        {needRestock && (
          <div className="flex items-center gap-4 bg-surface border border-rule rounded rail-red px-5 py-4">
            <div className="w-8 h-8 rounded bg-panel border border-rule flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-sig-red" />
            </div>
            <div>
              <p className="text-sm font-semibold text-sig-red">Restock Required</p>
              <p className="text-xs text-ink-2 mt-0.5">
                At current forecast demand you need to order{" "}
                <b className="text-sig-red">{Math.abs(deficit!).toFixed(0)} units</b> to cover the next {days} days.
                {daysLeft !== null && ` Current stock covers ~${daysLeft} day${daysLeft !== 1 ? "s" : ""}.`}
                {hasFestival && " Festival demand boost included."}
              </p>
            </div>
          </div>
        )}
        {hasStock && daysLeft !== null && !needRestock && (
          <div className="flex items-center gap-4 bg-surface border border-rule rounded rail-green px-5 py-4">
            <div className="w-8 h-8 rounded bg-panel border border-rule flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-sig-green" />
            </div>
            <p className="text-sm text-ink-2">
              Stock sufficient — <b className="text-sig-green">{Math.abs(deficit!).toFixed(0)} units surplus</b> over the {days}-day horizon.
              {daysLeft !== null && ` Stock lasts ~${daysLeft} days.`}
            </p>
          </div>
        )}

        {/* KPI strip */}
        {data && (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "Total Forecast", value: totalForecast.toFixed(0), sub: `units / ${days} days`, color: "text-brand" },
              { label: "Avg Daily",      value: avgForecast.toFixed(1),    sub: "units per day",        color: "text-ink" },
              ...(hasStock && daysLeft !== null ? [{
                label: "Days of Stock", value: String(daysLeft), sub: "until stockout",
                color: daysLeft < 7 ? "text-sig-red" : daysLeft < 14 ? "text-sig-amber" : "text-sig-green",
              }] : []),
              ...(hasStock && deficit !== null ? [{
                label: deficit < 0 ? "Order Needed" : "Stock Surplus",
                value: Math.abs(deficit).toFixed(0),
                sub: deficit < 0 ? "units to order" : "units excess",
                color: deficit < 0 ? "text-sig-red" : "text-sig-green",
              }] : []),
            ].map((m) => (
              <div key={m.label} className="card text-center">
                <p className="eyebrow">{m.label}</p>
                <p className={`figure text-2xl mt-2 ${m.color}`}>{m.value}</p>
                <p className="text-xs text-ink-3 mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title"><Zap className="w-3.5 h-3.5" /> Historical Sales + Demand Forecast</h2>
            <div className="flex items-center gap-3">
              {hasFestival && (
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={showBase} onChange={(e) => setShowBase(e.target.checked)}
                    className="w-3 h-3" style={{ accentColor: "var(--brand)" }} />
                  <span className="text-[11px] text-ink-3">Show base demand</span>
                </label>
              )}
              {loading && <div className="loader" />}
            </div>
          </div>

          {hasFestival && (
            <div className="flex flex-wrap gap-2 mb-4">
              {festivalDates.map((f) => <span key={f.name} className="tag tag-amber">🎉 {f.name}</span>)}
            </div>
          )}

          {error ? (
            <div className="h-72 flex flex-col items-center justify-center gap-3">
              <AlertTriangle className="w-8 h-8 text-sig-red opacity-50" />
              <p className="text-ink-3 text-sm">Failed to load forecast — check backend connection</p>
              <button onClick={load} className="btn-ghost text-xs">Retry</button>
            </div>
          ) : !data && !loading ? (
            <div className="h-72 flex items-center justify-center text-ink-3 text-sm">Select a store and product above</div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="foreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#F26522" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#F26522" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7E908B" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#7E908B" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,241,234,0.09)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#7E908B", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#2C4F52" }}
                  interval={Math.max(1, Math.floor(chartData.length / 8))} />
                <YAxis tick={{ fill: "#7E908B", fontSize: 10 }} tickLine={false} axisLine={false} width={35} />
                <Tooltip
                  contentStyle={{ background: "#0E2A2E", border: "1px solid #2C4F52", borderRadius: 6, fontSize: 12, padding: "8px 12px", color: "#F4F1EA" }}
                  labelStyle={{ color: "#B8C4BF", marginBottom: 4 }}
                  itemStyle={{ color: "#F4F1EA" }}
                  cursor={{ stroke: "rgba(242,101,34,0.25)" }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#7E908B", paddingTop: 8 }} />
                {splitDate && (
                  <ReferenceLine x={splitDate} stroke="rgba(242,101,34,0.55)" strokeDasharray="4 4"
                    label={{ value: "Forecast Start", fill: "#F26522", fontSize: 10, dy: -6 }} />
                )}
                {festivalDates.map((f) => (
                  <ReferenceLine key={f.name} x={f.date} stroke="rgba(245,165,36,0.5)" strokeDasharray="3 3"
                    label={{ value: f.name, fill: "#F5A524", fontSize: 9, dy: 12 }} />
                ))}
                <Area dataKey="actual" name="Actual Sales" stroke="#7E908B" fill="url(#actGrad)" dot={false} strokeWidth={1.5} connectNulls={false} />
                {hasFestival && showBase && (
                  <Line dataKey="base" name="Base Demand" stroke="#566863" dot={false} strokeWidth={1.5} strokeDasharray="5 3" connectNulls={false} />
                )}
                <Area dataKey="adjusted" name="Festival-Adjusted Forecast" stroke="#F26522" fill="url(#foreGrad)" dot={false} strokeWidth={2} connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}

          <p className="text-[10px] text-ink-4 mt-3 text-right font-mono">
            Pattern model trained on 2013–2017 retail data.
            {data?.dates_remapped && " Dates remapped to current timeline — seasonal patterns preserved."}
            {data?.has_user_data && " Forecast incorporates your uploaded sales history."}
          </p>
        </div>
      </div>
    </div>
  );
}
