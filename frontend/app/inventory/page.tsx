"use client";
import { useState, useEffect, useCallback } from "react";
import { api, type InventoryRecord, type Alert, type Store } from "@/lib/api";
import { CheckCircle, RefreshCw, Filter, Package, AlertTriangle, Activity, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 25;
const ALERTS_PER_PAGE = 20;

const SEG_BADGE: Record<string, string> = {
  fast: "badge-fast", slow: "badge-slow", premium: "badge-premium", essential: "badge-essential",
};
const STATUS_STYLE: Record<string, string> = {
  ok: "text-sig-green", reorder: "text-sig-amber", critical: "text-sig-red",
  stockout: "text-sig-red font-bold", overstock: "text-sig-blue",
};
const STATUS_DOT: Record<string, string> = {
  ok: "bg-sig-green", reorder: "bg-sig-amber", critical: "bg-sig-red",
  stockout: "bg-sig-red", overstock: "bg-sig-blue",
};
const STATUS_LABEL: Record<string, string> = {
  ok: "OK", reorder: "Reorder", critical: "Critical", stockout: "STOCKOUT", overstock: "Overstock",
};
const STATUS_BAR: Record<string, string> = {
  ok: "bg-sig-green", reorder: "bg-sig-amber", critical: "bg-sig-red",
  stockout: "bg-sig-red", overstock: "bg-sig-blue",
};
const STATUS_TAG: Record<string, string> = {
  ok: "tag-green", reorder: "tag-amber", critical: "tag-red", stockout: "tag-red", overstock: "tag-blue",
};
const SEVERITY: Record<string, number> = { stockout: 0, critical: 1, reorder: 2, overstock: 3, ok: 4 };

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [alerts, setAlerts]       = useState<Alert[]>([]);
  const [stores, setStores]       = useState<Store[]>([]);
  const [storeFilter, setStoreFilter]   = useState<number | "all">("all");
  const [segFilter, setSegFilter]       = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editRow, setEditRow]           = useState<{ store: number; item: number; val: string } | null>(null);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [activeTab, setActiveTab]       = useState<"alerts" | "inventory">("alerts");
  const [currentPage, setCurrentPage]   = useState(1);
  const [alertPage, setAlertPage]       = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const sid = storeFilter === "all" ? undefined : storeFilter;
    try {
      const [inv, al] = await Promise.all([api.inventory(sid), api.alerts(sid, "active")]);
      setInventory(inv); setAlerts(al);
    } finally { setLoading(false); }
  }, [storeFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.stores().then(setStores).catch(() => {}); }, []);
  useEffect(() => { setCurrentPage(1); setAlertPage(1); }, [storeFilter, segFilter, statusFilter]);

  const saveStock = async (store: number, item: number, val: string) => {
    const n = parseInt(val);
    if (isNaN(n) || n < 0) return;
    setSaving(true);
    try { await api.updateStock(store, item, n); setEditRow(null); load(); }
    finally { setSaving(false); }
  };

  const resolve = async (id: string) => { await api.resolveAlert(id); load(); };

  const filtered = inventory
    .filter((r) =>
      (segFilter === "all"    || r.sku_segment === segFilter) &&
      (statusFilter === "all" || r.status === statusFilter)
    )
    .sort((a, b) => (SEVERITY[a.status] ?? 9) - (SEVERITY[b.status] ?? 9));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const critCount     = alerts.filter((a) => a.alert_type === "critical").length;
  const reorderCount  = alerts.filter((a) => a.alert_type === "reorder").length;
  const stockoutCount = inventory.filter((r) => r.status === "stockout").length;

  const pageNums = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
    return start + i;
  }).filter((p) => p >= 1 && p <= totalPages);

  return (
    <div className="relative min-h-screen">
      {/* Masthead */}
      <header className="px-8 pt-8 pb-6 bg-surface" style={{ borderBottom: "1px solid var(--rule-strong)" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="pill-green"><Package className="w-3 h-3" /> Inventory Control</span>
            </div>
            <h1 className="display-heading text-3xl">Inventory</h1>
            <p className="text-ink-3 text-sm mt-1.5 font-mono">Stock levels · reorder signals · safety stock</p>
          </div>
          <button onClick={load} className="btn-ghost text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-3 mt-5">
          {[
            { label: "Active Alerts", value: alerts.length, color: "text-sig-amber", dot: "bg-sig-amber" },
            { label: "Critical",      value: critCount,     color: "text-sig-red",   dot: "bg-sig-red" },
            { label: "Reorder",       value: reorderCount,  color: "text-sig-amber", dot: "bg-sig-amber" },
            { label: "Stockouts",     value: stockoutCount, color: "text-sig-red",   dot: "bg-sig-red" },
          ].map((chip) => (
            <div key={chip.label} className="stat-chip flex-row items-center gap-2.5 min-w-[130px]">
              <span className={`w-1.5 h-1.5 rounded-full ${chip.dot}`} />
              <span className="eyebrow flex-1">{chip.label}</span>
              <span className={`figure text-base ${chip.color}`}>{chip.value}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="px-8 py-7 space-y-5">
        {/* Filters */}
        <div className="card flex flex-wrap gap-4 items-center py-3.5">
          <Filter className="w-3.5 h-3.5 text-ink-3" />
          <select value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value === "all" ? "all" : +e.target.value)}
            className="select">
            <option value="all">All Stores</option>
            {stores.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select value={segFilter} onChange={(e) => setSegFilter(e.target.value)} className="select">
            <option value="all">All Segments</option>
            {["fast", "slow", "premium", "essential"].map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select">
            <option value="all">All Statuses</option>
            {Object.keys(STATUS_LABEL).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <span className="ml-auto text-xs text-ink-3 font-mono">{filtered.length} records</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-0" style={{ borderBottom: "1px solid var(--rule-strong)" }}>
          {([
            { id: "alerts" as const,    label: "Active Alerts", count: alerts.length },
            { id: "inventory" as const, label: "Stock Table",   count: filtered.length },
          ]).map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`relative px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] font-mono transition-colors ${
                activeTab === t.id ? "text-brand" : "text-ink-3 hover:text-ink"
              }`}>
              {t.label} <span className="ml-1">({t.count})</span>
              {activeTab === t.id && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-brand" />}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3">
            <div className="loader" /><span className="text-ink-3 text-sm">Loading inventory…</span>
          </div>
        ) : activeTab === "alerts" ? (
          (() => {
            const alertTotalPages = Math.max(1, Math.ceil(alerts.length / ALERTS_PER_PAGE));
            const pagedAlerts = alerts.slice((alertPage - 1) * ALERTS_PER_PAGE, alertPage * ALERTS_PER_PAGE);
            const alertPageNums = Array.from({ length: Math.min(5, alertTotalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(alertPage - 2, alertTotalPages - 4));
              return start + i;
            }).filter((p) => p >= 1 && p <= alertTotalPages);

            return (
              <div className="space-y-2">
                {alerts.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-10 h-10 rounded bg-panel border border-rule flex items-center justify-center mx-auto mb-3">
                      <Activity className="w-5 h-5 text-sig-green" />
                    </div>
                    <p className="text-ink-2 text-sm font-medium">All clear</p>
                    <p className="text-ink-3 text-xs mt-1">No active inventory alerts</p>
                  </div>
                ) : (
                  <>
                    {pagedAlerts.map((a) => (
                      <div key={a._id}
                        className={`flex items-center justify-between gap-4 rounded bg-surface border border-rule px-4 py-3 ${a.alert_type === "critical" ? "rail-red" : "rail-amber"}`}>
                        <div className="flex items-start gap-3 min-w-0">
                          <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${a.alert_type === "critical" ? "text-sig-red" : "text-sig-amber"}`} />
                          <div>
                            <div className="flex items-center flex-wrap gap-2">
                              <span className="text-sm font-semibold text-ink">{a.item_name}</span>
                              <span className="text-xs text-ink-3">
                                @ {stores.find((s) => s._id === a.store_id)?.name ?? `Store ${a.store_id}`}
                              </span>
                              <span className={SEG_BADGE[a.sku_segment] ?? ""}>{a.sku_segment}</span>
                              <span className={`tag ${a.alert_type === "critical" ? "tag-red" : "tag-amber"}`}>
                                {a.alert_type.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-ink-3 font-mono">
                              <span>Stock <b className="text-ink font-semibold">{a.current_stock}</b></span>
                              <span>Reorder pt <b className="text-ink font-semibold">{a.reorder_point}</b></span>
                              <span>Safety <b className="text-ink font-semibold">{a.safety_stock}</b></span>
                              <span>EOQ <b className="text-ink font-semibold">{a.eoq}</b></span>
                              <span>Stockout in <b className="text-sig-amber">{a.days_until_stockout}d</b></span>
                              <span>Order <b className="text-sig-green">{a.recommended_order_qty}u</b></span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => resolve(a._id)} className="btn-ghost text-xs shrink-0 text-sig-green">
                          <CheckCircle className="w-3.5 h-3.5" /> Resolve
                        </button>
                      </div>
                    ))}

                    {alertTotalPages > 1 && (
                      <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--rule)" }}>
                        <span className="text-xs text-ink-3 font-mono">
                          {(alertPage - 1) * ALERTS_PER_PAGE + 1}–{Math.min(alertPage * ALERTS_PER_PAGE, alerts.length)} of {alerts.length} alerts
                        </span>
                        <div className="flex items-center gap-1">
                          <button disabled={alertPage === 1} onClick={() => setAlertPage((p) => p - 1)} className="btn-ghost p-1.5 disabled:opacity-30">
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          {alertPageNums.map((p) => (
                            <button key={p} onClick={() => setAlertPage(p)}
                              className={`text-xs px-2.5 py-1 rounded font-mono transition-colors ${
                                p === alertPage ? "bg-brand-soft text-brand border border-brand/30" : "text-ink-3 hover:text-ink hover:bg-panel"
                              }`}>{p}</button>
                          ))}
                          <button disabled={alertPage === alertTotalPages} onClick={() => setAlertPage((p) => p + 1)} className="btn-ghost p-1.5 disabled:opacity-30">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Store</th><th>Item</th><th>SKU</th>
                    <th className="text-right">Stock</th><th className="text-right">Safety</th>
                    <th className="text-right">Reorder Pt</th><th className="text-right">Days Left</th>
                    <th>Status</th><th className="text-center">Update</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r) => {
                    const fillPct = r.reorder_point > 0
                      ? Math.min(100, Math.round((r.current_stock / (r.reorder_point * 2)) * 100)) : 100;
                    const storeName = stores.find(s => s._id === r.store_id)?.name ?? `Store ${r.store_id}`;
                    return (
                      <tr key={`${r.store_id}-${r.item_id}`}>
                        <td className="text-ink-3 text-xs">{storeName.replace("Blinkit ", "")}</td>
                        <td className="font-medium text-ink">{r.item_name}</td>
                        <td><span className={SEG_BADGE[r.sku_segment] ?? ""}>{r.sku_segment}</span></td>
                        <td className="text-right font-mono text-ink font-semibold tnum">{r.current_stock}</td>
                        <td className="text-right font-mono text-ink-3 tnum">{r.safety_stock}</td>
                        <td className="text-right font-mono text-ink-3 tnum">{r.reorder_point}</td>
                        <td className={`text-right font-mono tnum ${
                          r.days_until_stockout <= 1 ? "text-sig-red font-bold" :
                          r.days_until_stockout < 7  ? "text-sig-red" :
                          r.days_until_stockout < 14 ? "text-sig-amber" : "text-ink-2"
                        }`}>
                          {r.days_until_stockout <= 0 ? "OUT" : `${r.days_until_stockout}d`}
                        </td>
                        <td>
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <span className={`tag ${STATUS_TAG[r.status] ?? "tag-ink"} shrink-0`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[r.status] ?? "bg-ink-4"}`} />
                              {STATUS_LABEL[r.status] ?? r.status}
                            </span>
                            <div className="flex-1 h-1 bg-sunk rounded-full overflow-hidden min-w-[40px]">
                              <div className={`h-full rounded-full ${STATUS_BAR[r.status] ?? "bg-ink-4"}`} style={{ width: `${fillPct}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          {editRow?.store === r.store_id && editRow?.item === r.item_id ? (
                            <div className="flex gap-1 justify-center">
                              <input type="number" value={editRow.val}
                                onChange={(e) => setEditRow({ ...editRow, val: e.target.value })}
                                className="w-16 input text-xs px-2 py-1" />
                              <button onClick={() => saveStock(r.store_id, r.item_id, editRow.val)} disabled={saving}
                                className="text-xs text-sig-green px-1.5 disabled:opacity-50 font-bold">{saving ? "…" : "✓"}</button>
                              <button onClick={() => setEditRow(null)} className="text-xs text-ink-3 hover:text-ink px-1">×</button>
                            </div>
                          ) : (
                            <button onClick={() => setEditRow({ store: r.store_id, item: r.item_id, val: String(r.current_stock) })}
                              className="text-xs text-brand hover:underline px-2 py-0.5">Edit</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid var(--rule-strong)" }}>
                <span className="text-xs text-ink-3 font-mono">
                  {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="btn-ghost p-1.5 disabled:opacity-30">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {pageNums.map((p) => (
                    <button key={p} onClick={() => setCurrentPage(p)}
                      className={`text-xs px-2.5 py-1 rounded font-mono transition-colors ${
                        p === currentPage ? "bg-brand-soft text-brand border border-brand/30" : "text-ink-3 hover:text-ink hover:bg-panel"
                      }`}>{p}</button>
                  ))}
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="btn-ghost p-1.5 disabled:opacity-30">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
