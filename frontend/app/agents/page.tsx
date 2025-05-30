"use client";
import { useState, useEffect, useRef } from "react";
import { api, type Store, type AgentRun, type PurchaseOrder } from "@/lib/api";
import {
  Brain, Zap, Package, Truck, CheckCircle, XCircle,
  RefreshCw, ShoppingCart,
} from "lucide-react";

/* ─── Agent meta ─────────────────────────────────────────────── */
const AGENT_META: Record<string, { label: string; icon: typeof Brain; color: string; bg: string }> = {
  demand:    { label: "Demand Agent",    icon: Brain,   color: "text-accent-cyan",   bg: "bg-accent-cyan/10"   },
  inventory: { label: "Inventory Agent", icon: Package, color: "text-accent-violet", bg: "bg-accent-violet/10" },
  logistics: { label: "Logistics Agent", icon: Truck,   color: "text-accent-green",  bg: "bg-accent-green/10"  },
};

const LEVEL_COLOR: Record<string, string> = {
  info:    "text-slate-400",
  warning: "text-amber-400",
  error:   "text-red-400",
  success: "text-emerald-400",
};

const URGENCY_CHIP: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high:     "bg-amber-500/15 text-amber-400 border-amber-500/30",
  normal:   "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const PRIORITY_CHIP: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400 border-red-500/30",
  high:   "bg-amber-500/15 text-amber-400 border-amber-500/30",
  normal: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

/* ─── Component ──────────────────────────────────────────────── */
export default function AgentsPage() {
  const [stores, setStores]             = useState<Store[]>([]);
  const [storeId, setStoreId]           = useState(1);
  const [running, setRunning]           = useState(false);
  const [currentRun, setCurrentRun]     = useState<AgentRun | null>(null);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [pendingPOs, setPendingPOs]     = useState<PurchaseOrder[]>([]);
  const [rejectNote, setRejectNote]     = useState<Record<string, string>>({});
  const [rejectOpen, setRejectOpen]     = useState<Record<string, boolean>>({});
  const [poAction, setPoAction]         = useState<Record<string, "approving"|"rejecting"|null>>({});
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.stores().then(setStores).catch(() => {});
    loadPendingPOs();
  }, []);

  // Animate steps in one-by-one
  useEffect(() => {
    if (!currentRun || visibleSteps >= currentRun.steps.length) return;
    const t = setTimeout(() => setVisibleSteps(v => v + 1), 180);
    return () => clearTimeout(t);
  }, [currentRun, visibleSteps]);

  // Scroll feed to bottom as steps appear
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [visibleSteps]);

  async function loadPendingPOs() {
    try { setPendingPOs(await api.listPurchaseOrders("pending")); }
    catch { /* silent */ }
  }

  async function handleRun() {
    setRunning(true);
    setCurrentRun(null);
    setVisibleSteps(0);
    try {
      const run = await api.runAgents(storeId);
      setCurrentRun(run);
      setVisibleSteps(0);
      loadPendingPOs();
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
    }
  }

  async function handleApprove(poId: string) {
    setPoAction(p => ({ ...p, [poId]: "approving" }));
    try {
      await api.approvePO(poId);
      setPendingPOs(prev => prev.filter(p => p._id !== poId));
      if (currentRun?.purchase_order_id === poId) {
        setCurrentRun(r => r ? { ...r, _po_status: "approved" } : r);
      }
    } finally { setPoAction(p => ({ ...p, [poId]: null })); }
  }

  async function handleReject(poId: string) {
    setPoAction(p => ({ ...p, [poId]: "rejecting" }));
    try {
      await api.rejectPO(poId, rejectNote[poId] || "");
      setPendingPOs(prev => prev.filter(p => p._id !== poId));
      if (currentRun?.purchase_order_id === poId) {
        setCurrentRun(r => r ? { ...r, _po_status: "rejected" } : r);
      }
      setRejectOpen(p => ({ ...p, [poId]: false }));
    } finally { setPoAction(p => ({ ...p, [poId]: null })); }
  }

  return (
    <div className="relative min-h-screen">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-bg-border"
        style={{ background: "linear-gradient(180deg,rgba(139,92,246,.05) 0%,transparent 100%)" }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-violet-400 border border-violet-400/30 bg-violet-400/5 px-3 py-1 rounded-full">
            <Zap className="w-3 h-3" />
            AI Control Tower
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Multi-Agent Inventory Planner</h1>
        <p className="text-slate-500 text-sm mt-1">
          Three LangGraph agents debate demand signals and draft purchase orders for manager approval
        </p>
      </div>

      <div className="px-8 py-7 space-y-7 max-w-5xl">

        {/* Agent pipeline diagram */}
        <div className="card border-violet-500/10">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-600 mb-4">Agent Pipeline</p>
          <div className="flex items-center gap-3 flex-wrap">
            {(["demand","inventory","logistics"] as const).map((key, i) => {
              const m = AGENT_META[key];
              const Icon = m.icon;
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${m.bg} border-current/20`}>
                    <Icon className={`w-4 h-4 ${m.color}`} />
                    <div>
                      <div className={`text-xs font-semibold ${m.color}`}>{m.label}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">
                        {key === "demand" ? "Forecast · Anomaly detection" :
                         key === "inventory" ? "Capacity · Festival adjust" :
                         "Draft PO · Cost analysis"}
                      </div>
                    </div>
                  </div>
                  {i < 2 && <div className="text-slate-700 font-mono text-lg">→</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Trigger */}
        <div className="card space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Store</label>
              <select value={storeId} onChange={e => setStoreId(+e.target.value)} className="select w-72">
                {stores.map(s => <option key={s._id} value={s._id}>{s.name} · {s.city}</option>)}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <button onClick={handleRun} disabled={running}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 mt-5">
                {running
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Running agents…</>
                  : <><Zap className="w-4 h-4" /> Run AI Analysis</>}
              </button>
            </div>
          </div>
          {running && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                    style={{ animationDelay: `${i*0.15}s` }} />
                ))}
              </div>
              Agents are analysing inventory and running forecasts…
            </div>
          )}
        </div>

        {/* Activity Feed */}
        {currentRun && (
          <div className="card border-violet-500/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-sm font-semibold text-white">Agent Activity Feed</span>
              </div>
              <span className="font-mono text-[10px] text-slate-600">{currentRun.store_name}</span>
            </div>

            <div ref={feedRef} className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {currentRun.steps.slice(0, visibleSteps).map((step, i) => {
                const meta = AGENT_META[step.agent];
                const Icon = meta?.icon ?? Brain;
                return (
                  <div key={i}
                    className="flex gap-3 rounded-xl px-3 py-2.5 transition-all duration-300"
                    style={{ background: "rgba(255,255,255,0.02)", animation: "fadeSlideIn 0.25s ease-out" }}>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${meta?.bg ?? "bg-slate-500/10"}`}>
                      <Icon className={`w-3 h-3 ${meta?.color ?? "text-slate-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta?.color ?? "text-slate-400"}`}>
                          {meta?.label ?? step.agent}
                        </span>
                        <span className={`text-xs font-medium ${LEVEL_COLOR[step.level] ?? "text-slate-400"}`}>
                          {step.message}
                        </span>
                      </div>
                      {step.detail && (
                        <p className="text-[11px] text-slate-600 mt-0.5">{step.detail}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {visibleSteps < currentRun.steps.length && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1 h-1 rounded-full bg-violet-400 animate-bounce"
                        style={{ animationDelay: `${i*0.12}s` }} />
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-600">Processing…</span>
                </div>
              )}
            </div>

            {/* Summary when done */}
            {visibleSteps >= currentRun.steps.length && currentRun.demand_analysis.length > 0 && (
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-bg-border">
                <div className="stat-chip text-center">
                  <span className="text-slate-500 text-[10px] uppercase tracking-wider">SKUs flagged</span>
                  <span className="text-xl font-bold text-white font-mono mt-1 block">
                    {currentRun.demand_analysis.length}
                  </span>
                </div>
                <div className="stat-chip text-center">
                  <span className="text-slate-500 text-[10px] uppercase tracking-wider">Order lines</span>
                  <span className="text-xl font-bold text-accent-cyan font-mono mt-1 block">
                    {currentRun.validated_orders.length}
                  </span>
                </div>
                <div className="stat-chip text-center">
                  <span className="text-slate-500 text-[10px] uppercase tracking-wider">Total cost</span>
                  <span className="text-xl font-bold text-accent-green font-mono mt-1 block">
                    ₹{currentRun.validated_orders.reduce((s, o) => s + o.subtotal, 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Current run's Purchase Order */}
        {currentRun?.purchase_order_id && (
          <POCard
            po={pendingPOs.find(p => p._id === currentRun.purchase_order_id) ?? null}
            poId={currentRun.purchase_order_id}
            poStatus={(currentRun as any)._po_status}
            rejectNote={rejectNote}
            setRejectNote={setRejectNote}
            rejectOpen={rejectOpen}
            setRejectOpen={setRejectOpen}
            poAction={poAction}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}

        {/* Other pending POs */}
        {pendingPOs.filter(p => p._id !== currentRun?.purchase_order_id).length > 0 && (
          <div className="space-y-4">
            <div className="section-divider-label">Other Pending Purchase Orders</div>
            {pendingPOs
              .filter(p => p._id !== currentRun?.purchase_order_id)
              .map(po => (
                <POCard
                  key={po._id}
                  po={po}
                  poId={po._id}
                  rejectNote={rejectNote}
                  setRejectNote={setRejectNote}
                  rejectOpen={rejectOpen}
                  setRejectOpen={setRejectOpen}
                  poAction={poAction}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
          </div>
        )}

      </div>

    </div>
  );
}

/* ─── PO Card ─────────────────────────────────────────────────── */
function POCard({
  po, poId, poStatus, rejectNote, setRejectNote,
  rejectOpen, setRejectOpen, poAction, onApprove, onReject,
}: {
  po: PurchaseOrder | null;
  poId: string;
  poStatus?: string;
  rejectNote: Record<string, string>;
  setRejectNote: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  rejectOpen: Record<string, boolean>;
  setRejectOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  poAction: Record<string, "approving" | "rejecting" | null>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (poStatus === "approved") {
    return (
      <div className="card border-emerald-500/20 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-emerald-400" />
        <div>
          <p className="text-sm font-semibold text-emerald-300">Purchase Order Approved</p>
          <p className="text-xs text-slate-500">PO#{poId.slice(0, 8).toUpperCase()} · Order submitted for processing</p>
        </div>
      </div>
    );
  }

  if (poStatus === "rejected") {
    return (
      <div className="card border-red-500/20 flex items-center gap-3">
        <XCircle className="w-5 h-5 text-red-400" />
        <div>
          <p className="text-sm font-semibold text-red-300">Purchase Order Rejected</p>
          <p className="text-xs text-slate-500">PO#{poId.slice(0, 8).toUpperCase()} · {rejectNote[poId] || "No reason given"}</p>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="card border-violet-500/10 flex items-center gap-3 py-5">
        <ShoppingCart className="w-5 h-5 text-violet-400" />
        <div>
          <p className="text-sm font-semibold text-white">Purchase Order Generated</p>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">PO#{poId.slice(0, 8).toUpperCase()} · Loading details…</p>
        </div>
      </div>
    );
  }

  const totalCost = po.total_cost ?? po.items.reduce((s, i) => s + i.subtotal, 0);

  return (
    <div className="card border-violet-500/15 space-y-4">
      {/* PO Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-bold text-white font-mono">
              PO#{po._id.slice(0, 8).toUpperCase()}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${PRIORITY_CHIP[po.priority] ?? ""}`}>
              {po.priority}
            </span>
          </div>
          <p className="text-xs text-slate-500">{po.store_name} · ETA {po.estimated_delivery}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-white font-mono">
            ₹{totalCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-500">{po.items.length} line items</div>
        </div>
      </div>

      {/* Line items */}
      <div className="overflow-x-auto">
        <table className="data-table text-xs w-full">
          <thead>
            <tr>
              <th className="text-left">Product</th>
              <th>Urgency</th>
              <th>Current Stock</th>
              <th>Order Qty</th>
              <th>Unit Cost</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((item, i) => (
              <tr key={i}>
                <td className="text-left">
                  <div className="font-medium">{item.item_name}</div>
                  {item.festival_adjusted && (
                    <div className="text-[10px] text-amber-400 mt-0.5">Festival-adjusted</div>
                  )}
                </td>
                <td>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase ${URGENCY_CHIP[item.urgency]}`}>
                    {item.urgency}
                  </span>
                </td>
                <td className="font-mono text-slate-400">{item.current_stock}</td>
                <td className="font-mono font-bold text-white">{item.order_qty}</td>
                <td className="font-mono text-slate-400">₹{item.unit_cost.toFixed(0)}</td>
                <td className="font-mono text-accent-green">₹{item.subtotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="text-right font-semibold text-slate-400 text-xs pt-2">Total</td>
              <td className="font-mono font-bold text-white pt-2">
                ₹{totalCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Approve / Reject */}
      <div className="flex items-start gap-3 pt-2 border-t border-bg-border flex-wrap">
        <button
          onClick={() => onApprove(po._id)}
          disabled={!!poAction[po._id]}
          className="btn-primary flex items-center gap-1.5 disabled:opacity-50">
          {poAction[po._id] === "approving"
            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            : <CheckCircle className="w-3.5 h-3.5" />}
          Approve Order
        </button>

        <div className="flex-1 min-w-0">
          {rejectOpen[po._id] ? (
            <div className="flex gap-2">
              <input
                value={rejectNote[po._id] ?? ""}
                onChange={e => setRejectNote(n => ({ ...n, [po._id]: e.target.value }))}
                placeholder="Reason for rejection (optional)"
                className="flex-1 bg-bg-panel border border-bg-border rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-red-500/50"
              />
              <button
                onClick={() => onReject(po._id)}
                disabled={!!poAction[po._id]}
                className="shrink-0 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                {poAction[po._id] === "rejecting"
                  ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  : <XCircle className="w-3.5 h-3.5" />}
                Confirm Reject
              </button>
              <button
                onClick={() => setRejectOpen(o => ({ ...o, [po._id]: false }))}
                className="shrink-0 px-3 py-2 rounded-lg text-slate-500 text-sm hover:text-slate-300 transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setRejectOpen(o => ({ ...o, [po._id]: true }))}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-400 text-sm font-medium border border-red-500/20 hover:bg-red-500/8 transition-colors">
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
