"use client";
import { useState, useEffect, useCallback } from "react";
import { api, type InventoryRecord, type Alert } from "@/lib/api";
import { CheckCircle, RefreshCw, Filter, Package, AlertTriangle, Activity } from "lucide-react";

const SEG_BADGE: Record<string, string> = {
  fast: "badge-fast", slow: "badge-slow", premium: "badge-premium", essential: "badge-essential",
};
const STATUS_STYLE: Record<string, string> = {
  ok: "text-emerald-400", reorder: "text-amber-400", critical: "text-red-400",
  stockout: "text-red-500 font-bold", overstock: "text-sky-400",
};
const STATUS_DOT: Record<string, string> = {
  ok: "bg-emerald-400 shadow-[0_0_5px_rgba(16,185,129,0.6)]",
  reorder: "bg-amber-400 shadow-[0_0_5px_rgba(245,158,11,0.6)]",
  critical: "bg-red-400 shadow-[0_0_5px_rgba(239,68,68,0.7)]",
  stockout: "bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)]",
  overstock: "bg-sky-400 shadow-[0_0_5px_rgba(56,189,248,0.5)]",
};
const STATUS_LABEL: Record<string, string> = {
  ok: "OK", reorder: "Reorder", critical: "Critical", stockout: "STOCKOUT", overstock: "Overstock",
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [alerts, setAlerts]       = useState<Alert[]>([]);
  const [storeFilter, setStoreFilter]   = useState<number | "all">("all");
  const [segFilter, setSegFilter]       = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editRow, setEditRow]           = useState<{ store: number; item: number; val: string } | null>(null);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [activeTab, setActiveTab]       = useState<"alerts" | "inventory">("alerts");

  const load = useCallback(async () => {
    setLoading(true);
    const sid = storeFilter === "all" ? undefined : storeFilter;
    try {
      const [inv, al] = await Promise.all([api.inventory(sid), api.alerts(sid, "active")]);
      setInventory(inv); setAlerts(al);
    } finally { setLoading(false); }
  }, [storeFilter]);

  useEffect(() => { load(); }, [load]);

  const saveStock = async (store: number, item: number, val: string) => {
    const n = parseInt(val);
    if (isNaN(n) || n < 0) return;
    setSaving(true);
    try { await api.updateStock(store, item, n); setEditRow(null); load(); }
    finally { setSaving(false); }
  };

  const resolve = async (id: string) => {
    await api.resolveAlert(id); load();
  };

  const filtered = inventory.filter((r) =>
    (segFilter === "all"    || r.sku_segment === segFilter) &&
    (statusFilter === "all" || r.status === statusFilter)
  );

  const critCount     = alerts.filter((a) => a.alert_type === "critical").length;
  const reorderCount  = alerts.filter((a) => a.alert_type === "reorder").length;
  const stockoutCount = inventory.filter((r) => r.status === "stockout").length;

  return (
    <div className="relative min-h-screen">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-bg-border"
        style={{ background: "linear-gradient(180deg, rgba(16,185,129,0.04) 0%, transparent 100%)" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-accent-green border border-accent-green/30 bg-accent-green/5 px-3 py-1 rounded-full">
                <Package className="w-3 h-3" />
                Inventory Control
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Inventory</h1>
            <p className="text-slate-500 text-sm mt-1">Stock levels, reorder signals, and safety stock</p>
          </div>
          <button onClick={load} className="btn-ghost flex items-center gap-2 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-3 mt-5">
          {[
            { label: "Active Alerts", value: alerts.length, color: "text-amber-400", dot: "bg-amber-400" },
            { label: "Critical",      value: critCount,     color: "text-red-400",   dot: "bg-red-400" },
            { label: "Reorder",       value: reorderCount,  color: "text-amber-300", dot: "bg-amber-300" },
            { label: "Stockouts",     value: stockoutCount, color: "text-red-500",   dot: "bg-red-600" },
          ].map((chip) => (
            <div key={chip.label} className="stat-chip">
              <span className={`w-1.5 h-1.5 rounded-full ${chip.dot}`} />
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">{chip.label}</span>
              <span className={`text-base font-bold font-mono ${chip.color}`}>{chip.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-8 py-7 space-y-5">
        {/* Filters */}
        <div className="card flex flex-wrap gap-4 items-center">
          <Filter className="w-3.5 h-3.5 text-slate-600" />
          <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value === "all" ? "all" : +e.target.value)} className="select">
            <option value="all">All Stores</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((s) => <option key={s} value={s}>Store {s}</option>)}
          </select>
          <select value={segFilter} onChange={(e) => setSegFilter(e.target.value)} className="select">
            <option value="all">All Segments</option>
            {["fast", "slow", "premium", "essential"].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select">
            <option value="all">All Statuses</option>
            {Object.keys(STATUS_LABEL).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <span className="ml-auto text-xs text-slate-600 font-mono">{filtered.length} records</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-bg-border">
          {([
            { id: "alerts" as const,    label: "Active Alerts",   count: alerts.length },
            { id: "inventory" as const, label: "Stock Table",     count: filtered.length },
          ]).map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`relative px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                activeTab === t.id
                  ? "text-accent-green"
                  : "text-slate-600 hover:text-slate-300"
              }`}>
              {t.label}
              <span className="ml-1.5 font-mono">({t.count})</span>
              {activeTab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-green rounded-full" />
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <div className="loader" />
            <span className="text-slate-500 text-sm">Loading inventory…</span>
          </div>
        ) : activeTab === "alerts" ? (
          /* Alert Cards */
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-slate-400 text-sm font-medium">All clear</p>
                <p className="text-slate-600 text-xs mt-1">No active inventory alerts</p>
              </div>
            ) : alerts.map((a) => (
              <div key={a._id}
                className={`flex items-center justify-between gap-4 rounded-xl px-4 py-3.5 border border-l-2 transition-colors
                  ${a.alert_type === "critical"
                    ? "border-red-500/20 border-l-red-500/70 bg-red-500/5 hover:bg-red-500/8"
                    : "border-amber-500/20 border-l-amber-500/70 bg-amber-500/5 hover:bg-amber-500/8"}`}>
                <div className="flex items-start gap-3 min-w-0">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${a.alert_type === "critical" ? "text-red-400" : "text-amber-400"}`} />
                  <div>
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-sm font-semibold text-white">Store {a.store_id} · {a.item_name}</span>
                      <span className={SEG_BADGE[a.sku_segment] ?? ""}>{a.sku_segment}</span>
                      <span className={`text-[10px] font-bold tracking-widest ${a.alert_type === "critical" ? "text-red-400" : "text-amber-400"}`}>
                        {a.alert_type.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-600">
                      <span>Stock <b className="text-slate-300">{a.current_stock}</b></span>
                      <span>Reorder pt <b className="text-slate-300">{a.reorder_point}</b></span>
                      <span>Safety <b className="text-slate-300">{a.safety_stock}</b></span>
                      <span>EOQ <b className="text-slate-300">{a.eoq}</b></span>
                      <span>Stockout in <b className="text-amber-400">{a.days_until_stockout}d</b></span>
                      <span>Order <b className="text-emerald-400">{a.recommended_order_qty} units</b></span>
                    </div>
                  </div>
                </div>
                <button onClick={() => resolve(a._id)}
                  className="btn-ghost flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-xs shrink-0">
                  <CheckCircle className="w-3.5 h-3.5" /> Resolve
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Stock Table */
          <div className="card overflow-x-auto p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Item</th>
                  <th>SKU</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Safety</th>
                  <th className="text-right">Reorder Pt</th>
                  <th className="text-right">EOQ</th>
                  <th className="text-right">Days Left</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Update</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={`${r.store_id}-${r.item_id}`}>
                    <td className="text-slate-400">S{r.store_id}</td>
                    <td className="font-medium text-white">{r.item_name}</td>
                    <td><span className={SEG_BADGE[r.sku_segment] ?? ""}>{r.sku_segment}</span></td>
                    <td className="text-right font-mono text-white">{r.current_stock}</td>
                    <td className="text-right font-mono text-slate-500">{r.safety_stock}</td>
                    <td className="text-right font-mono text-slate-500">{r.reorder_point}</td>
                    <td className="text-right font-mono text-slate-500">{r.eoq}</td>
                    <td className={`text-right font-mono ${r.days_until_stockout < 7 ? "text-red-400" : r.days_until_stockout < 14 ? "text-amber-400" : "text-slate-400"}`}>
                      {r.days_until_stockout}
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[r.status] ?? "bg-slate-500"}`} />
                        <span className={`text-xs font-semibold ${STATUS_STYLE[r.status] ?? "text-slate-400"}`}>
                          {STATUS_LABEL[r.status] ?? r.status}
                        </span>
                      </div>
                    </td>
                    <td className="text-center">
                      {editRow?.store === r.store_id && editRow?.item === r.item_id ? (
                        <div className="flex gap-1 justify-center">
                          <input type="number" value={editRow.val}
                            onChange={(e) => setEditRow({ ...editRow, val: e.target.value })}
                            className="w-16 bg-bg-card border border-accent-cyan/40 text-white text-xs rounded px-2 py-1 focus:outline-none" />
                          <button onClick={() => saveStock(r.store_id, r.item_id, editRow.val)}
                            disabled={saving}
                            className="text-xs text-emerald-400 hover:text-emerald-300 px-1.5 disabled:opacity-50">
                            {saving ? "…" : "Save"}
                          </button>
                          <button onClick={() => setEditRow(null)} className="text-xs text-slate-600 hover:text-white px-1">×</button>
                        </div>
                      ) : (
                        <button onClick={() => setEditRow({ store: r.store_id, item: r.item_id, val: String(r.current_stock) })}
                          className="text-xs text-slate-600 hover:text-accent-cyan transition-colors px-2 py-0.5 rounded hover:bg-accent-cyan/5">
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
